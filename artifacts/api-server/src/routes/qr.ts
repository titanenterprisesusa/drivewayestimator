import { Router } from "express";
import QRCode from "qrcode";

const router = Router();

router.get("/qr", async (req, res) => {
  try {
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const proto = req.headers["x-forwarded-proto"] || "https";
    const url = `${proto}://${host}/`;
    const dataUrl = await QRCode.toDataURL(url, {
      width: 400,
      margin: 2,
      color: { dark: "#111827", light: "#ffffff" },
    });
    res.json({ dataUrl, url });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});

export default router;
