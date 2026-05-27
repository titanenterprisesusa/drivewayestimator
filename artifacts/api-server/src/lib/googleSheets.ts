import { google } from "googleapis";
import { logger } from "./logger";

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON!;
  const credentials = JSON.parse(raw);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
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
  requestedService: boolean;
  createdAt: Date;
}) {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });

    const row = [
      estimate.createdAt.toLocaleString("en-US", { timeZone: "America/New_York" }),
      estimate.customerName,
      estimate.phone,
      estimate.email,
      estimate.address,
      estimate.squareFootage > 0 ? estimate.squareFootage.toString() : "—",
      estimate.squareFootage > 0 ? `$${estimate.basePrice.toFixed(2)}` : "—",
      estimate.squareFootage > 0 ? (estimate.hasCrackFill ? "Yes" : "No") : "—",
      estimate.squareFootage > 0 && estimate.hasCrackFill && estimate.crackFillPrice
        ? `$${estimate.crackFillPrice.toFixed(2)}`
        : "—",
      estimate.promoCode ?? "—",
      estimate.squareFootage > 0 ? `$${estimate.totalPrice.toFixed(2)}` : "—",
      estimate.marketingConsent ? "Yes" : "No",
      estimate.requestedService ? "Yes" : "No",
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Estimates!A:M",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });

    logger.info(
      { customerName: estimate.customerName, requestedService: estimate.requestedService },
      "Appended to Google Sheet",
    );
  } catch (err) {
    logger.error({ err }, "Failed to append to Google Sheet");
    throw err;
  }
}
