import { Router, type IRouter } from "express";
import healthRouter from "./health";
import estimatesRouter from "./estimates";
import qrRouter from "./qr";
import configRouter from "./config";
import placesRouter from "./places";

const router: IRouter = Router();

router.use(healthRouter);
router.use(estimatesRouter);
router.use(qrRouter);
router.use(configRouter);
router.use(placesRouter);

export default router;
