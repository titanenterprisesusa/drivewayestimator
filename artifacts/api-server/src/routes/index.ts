import { Router, type IRouter } from "express";
import healthRouter from "./health";
import estimatesRouter from "./estimates";
import qrRouter from "./qr";
import configRouter from "./config";

const router: IRouter = Router();

router.use(healthRouter);
router.use(estimatesRouter);
router.use(qrRouter);
router.use(configRouter);

export default router;
