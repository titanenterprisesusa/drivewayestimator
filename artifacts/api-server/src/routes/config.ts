import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/config", (_req, res) => {
  res.json({ googleMapsApiKey: process.env.GOOGLE_API_KEY ?? "" });
});

export default router;
