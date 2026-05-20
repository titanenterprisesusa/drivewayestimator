import { Router, type IRouter } from "express";

const router: IRouter = Router();

const MAPS_KEY = () => process.env.GOOGLE_API_KEY ?? "";

// GET /api/places/autocomplete?input=821+post+rd
// Uses the Places API (New) — must be enabled in Google Cloud Console
router.get("/places/autocomplete", async (req, res) => {
  const input = String(req.query.input ?? "").trim();
  if (!input) return res.json({ predictions: [] });

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": MAPS_KEY(),
      },
      body: JSON.stringify({
        input,
        includedRegionCodes: ["US"],
        includedPrimaryTypes: ["street_address", "premise"],
      }),
    });

    const data = await response.json() as {
      error?: { status: string; message: string };
      suggestions?: {
        placePrediction: {
          placeId: string;
          text: { text: string };
        };
      }[];
    };

    if (data.error) {
      console.error("[places/autocomplete] API error:", data.error.status, data.error.message);
      return res.status(502).json({ error: data.error.status, message: data.error.message });
    }

    const predictions = (data.suggestions ?? []).map((s) => ({
      placeId: s.placePrediction.placeId,
      description: s.placePrediction.text.text,
    }));

    res.json({ predictions });
  } catch (err) {
    console.error("[places/autocomplete] fetch error:", err);
    res.status(500).json({ error: "Places autocomplete failed" });
  }
});

// GET /api/places/details?placeId=ChIJ...
router.get("/places/details", async (req, res) => {
  const placeId = String(req.query.placeId ?? "").trim();
  if (!placeId) return res.status(400).json({ error: "placeId required" });

  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        "X-Goog-Api-Key": MAPS_KEY(),
        "X-Goog-FieldMask": "addressComponents",
      },
    });

    const data = await response.json() as {
      error?: { status: string; message: string };
      addressComponents?: {
        longText: string;
        shortText: string;
        types: string[];
      }[];
    };

    if (data.error) {
      console.error("[places/details] API error:", data.error.status, data.error.message);
      return res.status(502).json({ error: data.error.status, message: data.error.message });
    }

    res.json({ components: data.addressComponents ?? [] });
  } catch (err) {
    console.error("[places/details] fetch error:", err);
    res.status(500).json({ error: "Places details failed" });
  }
});

export default router;
