import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import productsRouter from "./products.js";
import categoriesRouter from "./categories.js";
import customersRouter from "./customers.js";
import suppliersRouter from "./suppliers.js";
import salesRouter from "./sales.js";
import debtsRouter from "./debts.js";
import returnsRouter from "./returns.js";
import treasuryRouter from "./treasury.js";
import reportsRouter from "./reports.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(productsRouter);
router.use(categoriesRouter);
router.use(customersRouter);
router.use(suppliersRouter);
router.use(salesRouter);
router.use(debtsRouter);
router.use(returnsRouter);
router.use(treasuryRouter);
router.use(reportsRouter);

export default router;
