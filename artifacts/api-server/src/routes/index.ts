import { Router, type IRouter } from "express";
import healthRouter from "./health";
import servicesRouter from "./services";
import testimonialsRouter from "./testimonials";
import contactRouter from "./contact";
import authRouter from "./auth";
import clientRouter from "./client";
import adminRouter from "./admin";
import currencyRouter from "./currency";

const router: IRouter = Router();

router.use(healthRouter);
router.use(currencyRouter);
router.use(servicesRouter);
router.use(testimonialsRouter);
router.use(contactRouter);
router.use(authRouter);
router.use(clientRouter);
router.use(adminRouter);

export default router;
