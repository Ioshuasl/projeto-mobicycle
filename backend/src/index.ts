import "dotenv/config";
import { createApp } from "./app.ts";

const PORT = Number(process.env.PORT) || 3000;

async function main() {
  const app = await createApp();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[backend] listening on http://0.0.0.0:${PORT} (${process.env.NODE_ENV ?? "development"})`);
  });
}

main().catch((err) => {
  console.error("[backend] startup failed:", err);
  process.exit(1);
});
