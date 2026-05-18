import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withTransaction } from "../config/db.ts";
import { HttpError } from "../interfaces/errors.ts";
import { settingsRepository } from "../repository/settings_repository.ts";

export const DEFAULT_BANNER_URL =
  "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?q=80&w=2070&auto=format&fit=crop";

const LOGO_PROMPT =
  "A modern and minimalist logo for an app called 'MOBICYCLE'. The central symbol is a stylized, floating coin in glowing neon green. In the center of the coin, instead of a dollar sign ($), there is a curved arrow wrapping around the edge (indicating cashback) that subtly connects to waves resembling a Wi-Fi signal or map routes in light blue. The background is a deep navy blue or graphite. The typography for the app name 'MOBICYCLE' should be modern, sans-serif, rounded, and clean.";

function resolveLogoOutputPath(): string {
  const servicesDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(servicesDir, "../../..");
  return path.join(repoRoot, "public", "logo.png");
}

export const settingsService = {
  async getBanner(): Promise<{ url: string }> {
    const value = await settingsRepository.getValue("banner_url");
    return { url: value || DEFAULT_BANNER_URL };
  },

  async getLogo(): Promise<{ url: string }> {
    const value = await settingsRepository.getValue("logo_url");
    return { url: value || "" };
  },

  async getAllSettings(): Promise<Record<string, string>> {
    return settingsRepository.findAllAsRecord();
  },

  async updateSettings(settings: Record<string, unknown> | undefined): Promise<{ success: true }> {
    if (!settings || typeof settings !== "object") {
      throw new HttpError(400, "settings é obrigatório");
    }

    await withTransaction(async () => {
      for (const [key, value] of Object.entries(settings)) {
        await settingsRepository.setValue(key, String(value));
      }
    });

    return { success: true };
  },

  async setBannerUrl(url: string | undefined): Promise<{ success: true }> {
    if (!url) {
      throw new HttpError(400, "url é obrigatória");
    }
    await settingsRepository.setValue("banner_url", url);
    return { success: true };
  },

  async clearImageCache(): Promise<{ success: true; version: string }> {
    const newVersion = Date.now().toString();
    await settingsRepository.setValue("image_cache_version", newVersion);
    return { success: true, version: newVersion };
  },

  async generateLogoToPublic(): Promise<{ success: true; message: string }> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new HttpError(500, "GEMINI_API_KEY is not set.");
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
          success: true,
          message: `Logo generated and saved to ${outputPath}`,
        };
      }
    }

    throw new HttpError(500, "Failed to generate logo: No image returned.");
  },
};