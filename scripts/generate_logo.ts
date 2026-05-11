import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateLogo() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set.");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = "Logo for the app 'MOBICYCLE'. Modern, minimalist style. Colors: neon green and neon blue. Central symbol: a stylized coin with a curved arrow indicating cashback, connecting to waves resembling a Wi-Fi signal or map routes. Background: deep navy blue or graphite. Typography: 'MOBICYCLE' in modern, rounded, clean font.";

  try {
    console.log("Generating logo...");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "1K"
        }
      }
    });

    let imagePartFound = false;
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64Data = part.inlineData.data;
        const buffer = Buffer.from(base64Data, "base64");
        const outputPath = path.join(__dirname, "../public/logo.png");
        fs.writeFileSync(outputPath, buffer);
        console.log(`Logo saved to ${outputPath}`);
        imagePartFound = true;
        break;
      }
    }

    if (!imagePartFound) {
      console.error("No image part found in the response.");
      console.log("Response text:", response.text);
    }
  } catch (error) {
    console.error("Error generating logo:", error);
  }
}

generateLogo();
