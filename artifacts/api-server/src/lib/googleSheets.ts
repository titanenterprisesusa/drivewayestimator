// Google Sheets integration via Replit Connectors SDK
// Handles sheet creation (first-run) and appending estimate rows
import { ReplitConnectors } from "@replit/connectors-sdk";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const SHEET_KEY = "google_sheet_id";
const SHARE_EMAIL = "titanenterprisesusa@gmail.com";

const HEADERS = [
  "Submission Date",
  "Customer Name",
  "Phone Number",
  "Email",
  "Service Address",
  "Driveway Size (sq ft)",
  "Base Price",
  "Crack Fill",
  "Crack Fill Price",
  "Promo Code",
  "Total Estimate",
  "Marketing Opt-In",
];

async function getConnectors() {
  return new ReplitConnectors();
}

async function getOrCreateSpreadsheet(): Promise<string> {
  const [row] = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, SHEET_KEY));

  if (row) return row.value;

  const connectors = await getConnectors();

  const createRes = await connectors.proxy("google-sheet", "/v4/spreadsheets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      properties: { title: "Titan Enterprises — Driveway Estimates" },
      sheets: [
        {
          properties: { title: "Estimates" },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: HEADERS.map((h) => ({
                    userEnteredValue: { stringValue: h },
                    userEnteredFormat: {
                      textFormat: { bold: true },
                      backgroundColor: { red: 0.08, green: 0.09, blue: 0.11 },
                    },
                  })),
                },
              ],
            },
          ],
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create spreadsheet: ${createRes.status} ${errText}`);
  }

  const sheet = await createRes.json() as { spreadsheetId: string };
  const sheetId = sheet.spreadsheetId;

  // Share the sheet with the business email
  try {
    await connectors.proxy(
      "google-sheet",
      `/v2/files/${sheetId}/permissions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "writer",
          type: "user",
          emailAddress: SHARE_EMAIL,
        }),
      }
    );
    logger.info({ sheetId, email: SHARE_EMAIL }, "Shared Google Sheet with business email");
  } catch (shareErr) {
    logger.warn({ shareErr }, "Could not share sheet — it will still be accessible via Drive");
  }

  await db.insert(settingsTable).values({ key: SHEET_KEY, value: sheetId });
  logger.info({ sheetId }, "Created new Google Sheet for estimates");

  return sheetId;
}

export async function appendEstimateToSheet(estimate: {
  customerName: string;
  phone: string;
  email: string;
  address: string;
  squareFootage: number;
  basePrice: number;
  hasCrackFill: boolean;
  crackFillPrice?: number | null;
  totalPrice: number;
  marketingConsent: boolean;
  promoCode?: string | null;
  createdAt: Date;
}) {
  try {
    const sheetId = await getOrCreateSpreadsheet();
    const connectors = await getConnectors();

    const row = [
      estimate.createdAt.toLocaleString("en-US", { timeZone: "America/New_York" }),
      estimate.customerName,
      estimate.phone,
      estimate.email,
      estimate.address,
      estimate.squareFootage.toString(),
      `$${estimate.basePrice.toFixed(2)}`,
      estimate.hasCrackFill ? "Yes" : "No",
      estimate.hasCrackFill && estimate.crackFillPrice
        ? `$${estimate.crackFillPrice.toFixed(2)}`
        : "—",
      estimate.promoCode ?? "—",
      `$${estimate.totalPrice.toFixed(2)}`,
      estimate.marketingConsent ? "✅" : "❌",
    ];

    const range = encodeURIComponent("Estimates!A:L");
    const appendRes = await connectors.proxy(
      "google-sheet",
      `/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: [row] }),
      }
    );

    if (!appendRes.ok) {
      const errText = await appendRes.text();
      throw new Error(`Sheets append failed: ${appendRes.status} ${errText}`);
    }

    // Look up the actual integer sheetId for the "Estimates" tab
    let gridSheetId = 0;
    try {
      const metaRes = await connectors.proxy(
        "google-sheet",
        `/v4/spreadsheets/${sheetId}?fields=sheets.properties`,
        { method: "GET" }
      );
      if (metaRes.ok) {
        const meta = await metaRes.json() as { sheets: { properties: { sheetId: number; title: string } }[] };
        const tab = meta.sheets?.find((s) => s.properties.title === "Estimates");
        if (tab) gridSheetId = tab.properties.sheetId;
      }
    } catch { /* fall back to 0 */ }

    // Apply white background + black text to all data rows (row index 1 onwards)
    // so rows are always readable regardless of Google Sheets default theme
    const formatRes = await connectors.proxy(
      "google-sheet",
      `/v4/spreadsheets/${sheetId}:batchUpdate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: gridSheetId,
                  startRowIndex: 1,   // skip header row
                  startColumnIndex: 0,
                  endColumnIndex: 12,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 1, green: 1, blue: 1 },
                    textFormat: { foregroundColor: { red: 0, green: 0, blue: 0 }, bold: false },
                  },
                },
                fields: "userEnteredFormat(backgroundColor,textFormat)",
              },
            },
          ],
        }),
      }
    );

    if (!formatRes.ok) {
      const errText = await formatRes.text();
      logger.warn({ errText }, "Could not apply data-row formatting to Google Sheet");
    }

    logger.info({ sheetId, customerName: estimate.customerName }, "Appended estimate to Google Sheet");
  } catch (err) {
    logger.error({ err }, "Failed to append estimate to Google Sheet");
    throw err;
  }
}
