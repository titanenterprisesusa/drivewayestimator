// Google Sheets integration via Replit Connectors SDK
// Handles sheet creation (first-run) and appending estimate rows
import { ReplitConnectors } from "@replit/connectors-sdk";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db/schema/settings";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const SHEET_KEY = "google_sheet_id";

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
  "Total Estimate",
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

  const sheet = await createRes.json() as { spreadsheetId: string };
  const sheetId = sheet.spreadsheetId;

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
      `$${estimate.totalPrice.toFixed(2)}`,
    ];

    const range = encodeURIComponent("Estimates!A:J");
    await connectors.proxy(
      "google-sheet",
      `/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: [row] }),
      }
    );

    logger.info({ sheetId, customerName: estimate.customerName }, "Appended estimate to Google Sheet");
  } catch (err) {
    logger.error({ err }, "Failed to append estimate to Google Sheet — skipping");
  }
}
