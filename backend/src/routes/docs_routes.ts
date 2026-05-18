import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { loadSwaggerSpec, readSwaggerYamlRaw } from "../config/swagger.ts";

/** Swagger UI em `/api/docs` e spec bruta em `/api/docs/openapi.yaml`. */
export function createDocsRoutes(): Router {
  const router = Router();
  const spec = loadSwaggerSpec();

  router.get("/docs/openapi.yaml", (_req, res) => {
    res.type("application/yaml").send(readSwaggerYamlRaw());
  });

  router.use("/docs", swaggerUi.serve);
  router.get(
    "/docs",
    swaggerUi.setup(spec, {
      customSiteTitle: "Mobicycle API",
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
      },
    })
  );

  return router;
}
