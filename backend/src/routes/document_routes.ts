import { Router, type RequestHandler } from "express";
import { documentController } from "../controllers/document_controller.ts";
import { authenticateUser, type AuthenticatedRequest } from "../middlewares/auth.middleware.ts";

/** Documentos do usuário — wiring apenas. */
export function createDocumentRoutes(): Router {
  const router = Router();
  const auth = authenticateUser as RequestHandler;

  router.get("/documents", auth, (req, res) =>
    documentController.list(req as AuthenticatedRequest, res)
  );

  router.post("/documents/upload", auth, (req, res) =>
    documentController.upload(req as AuthenticatedRequest, res)
  );

  return router;
}
