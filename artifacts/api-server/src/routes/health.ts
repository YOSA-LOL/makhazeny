import { Router, type IRouter } from "express";
import { checkDbConnection } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  const dbConnected = await checkDbConnection();
  res.json({
    status: dbConnected ? "ok" : "degraded",
    database: dbConnected ? "connected" : "disconnected",
  });
});

export default router;
