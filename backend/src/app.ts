import express, { type Express } from "express";
import helmet from "helmet";
import { connectRedis } from "./config/cache.ts";
import { initDatabase } from "./config/db.ts";
import { errorHandler } from "./middlewares/error_handler.ts";
import { createRateLimiters } from "./middlewares/rate-limit.middleware.ts";
import { createApiRouter } from "./routes/index.ts";
import logger, { httpLogger } from "./utils/logger.ts";

/**
 * Monta a aplicação Express.
 * Rotas e middlewares serão registrados em `routes/` e `controllers/`
 * na migração do `server.ts` da raiz do monorepo.
 */
export async function createApp(): Promise<Express> {
  await initDatabase();
  logger.info("[System] MySQL initialized (schema + seeds + migrations)");

  const redisOk = await connectRedis();
  const { apiLimiter, authLimiter } = createRateLimiters(redisOk);
  logger.info(
    `[System] Rate limiting (${redisOk ? "Redis" : "in-memory"} store)`
  );

  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(httpLogger);
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use("/api/", apiLimiter);
  app.use("/api", createApiRouter({ authLimiter }));
  app.use(errorHandler);

  return app;
}
