import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router, type Response } from "express";
import { db, ensureSetting, withTransaction } from "../../config/db.ts";

const LOGO_PROMPT =
  "A modern and minimalist logo for an app called 'MOBICYCLE'. The central symbol is a stylized, floating coin in glowing neon green. In the center of the coin, instead of a dollar sign ($), there is a curved arrow wrapping around the edge (indicating cashback) that subtly connects to waves resembling a Wi-Fi signal or map routes in light blue. The background is a deep navy blue or graphite. The typography for the app name 'MOBICYCLE' should be modern, sans-serif, rounded, and clean.";

function resolveLogoOutputPath(): string {
  const routesDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(routesDir, "../../../..");
  return path.join(repoRoot, "public", "logo.png");
}

async function generateLogoToPublic(): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "GEMINI_API_KEY is not set." };
  }

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [{ parts: [{ text: LOGO_PROMPT }] }],
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "1K",
      },
    },
  });

  const outputPath = resolveLogoOutputPath();
  const publicDir = path.dirname(outputPath);

  for (const part of response.candidates?.[0]?.content?.parts ?? []) {
    if (part.inlineData?.data) {
      const buffer = Buffer.from(part.inlineData.data, "base64");
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      fs.writeFileSync(outputPath, buffer);
      return {
        ok: true,
        message: `Logo generated and saved to ${outputPath}`,
      };
    }
  }

  return { ok: false, error: "Failed to generate logo: No image returned." };
}

/** Admin — settings, banner, cache e logo (migrado de `server.ts`). */
export function createAdminSettingsRoutes(): Router {
  const router = Router();

  router.get("/settings/all", async (_req, res: Response) => {
    try {
      const settings = (await db.prepare("SELECT * FROM settings").all()) as Array<{
        key: string;
        value: string;
      }>;
      const settingsMap = settings.reduce<Record<string, string>>((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      res.json(settingsMap);
    } catch {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  router.post("/settings/update", async (req, res: Response) => {
    try {
      const { settings } = req.body as { settings?: Record<string, unknown> };
      if (!settings || typeof settings !== "object") {
        return res.status(400).json({ error: "settings é obrigatório" });
      }

      await withTransaction(async () => {
        for (const [key, value] of Object.entries(settings)) {
          await ensureSetting(key, String(value));
        }
      });
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  router.post("/settings/banner", async (req, res: Response) => {
    try {
      const { url } = req.body as { url?: string };
      if (!url) {
        return res.status(400).json({ error: "url é obrigatória" });
      }
      await ensureSetting("banner_url", url);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  router.post("/admin/clear-image-cache", async (_req, res: Response) => {
    try {
      const newVersion = Date.now().toString();
      await ensureSetting("image_cache_version", newVersion);
      res.json({ success: true, version: newVersion });
    } catch (err) {
      console.error("Error clearing image cache:", err);
      res.status(500).json({ error: "Erro ao limpar cache de imagens" });
    }
  });

  router.get("/generate-logo", async (_req, res: Response) => {
    try {
      const result = await generateLogoToPublic();
      if (!result.ok) {
        return res.status(500).json({ error: result.error });
      }
      res.json({ success: true, message: result.message });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  router.post("/admin/generate-logo", async (_req, res: Response) => {
    try {
      console.log("Generating logo via API...");
      const result = await generateLogoToPublic();
      if (!result.ok) {
        return res.status(500).json({ error: result.error });
      }
      res.json({ success: true, message: result.message });
    } catch (err) {
      console.error("Error generating logo:", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Failed to generate logo",
      });
    }
  });

  return router;
}
