import { Router, type IRouter } from "express";

const router: IRouter = Router();

const MAPS_KEY = () => process.env.GOOGLE_API_KEY ?? "";

// GET /api/places/autocomplete?input=821+post+rd
router.get("/places/autocomplete", async (req, res) => {
  const input = String(req.query.input ?? "").trim();
  if (!input) return res.json({ predictions: [] });

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", input);
  url.searchParams.set("types", "address");
  url.searchParams.set("components", "country:us");
  url.searchParams.set("key", MAPS_KEY());

  try {
    const response = await fetch(url.toString());
    const data = await response.json() as {
      status: string;
      predictions: { place_id: string; description: string }[];
    };
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return res.status(502).json({ error: data.status });
    }
    res.json({ predictions: data.predictions ?? [] });
  } catch (err) {
    res.status(500).json({ error: "Places autocomplete failed" });
  }
});

// GET /api/places/details?placeId=ChIJ...
router.get("/places/details", async (req, res) => {
  const placeId = String(req.query.placeId ?? "").trim();
  if (!placeId) return res.status(400).json({ error: "placeId required" });

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "address_components");
  url.searchParams.set("key", MAPS_KEY());

  try {
    const response = await fetch(url.toString());
    const data = await response.json() as {
      status: string;
      result: { address_components: { long_name: string; short_name: string; types: string[] }[] };
    };
    if (data.status !== "OK") {
      return res.status(502).json({ error: data.status });
    }
    res.json({ components: data.result.address_components ?? [] });
  } catch (err) {
    res.status(500).json({ error: "Places details failed" });
  }
});

export default router;
