import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const CONFIG_DIR = path.dirname(fileURLToPath(import.meta.url));
const SWAGGER_YAML_PATH = path.join(CONFIG_DIR, "swagger.yaml");

let cachedSpec: Record<string, unknown> | null = null;

/** Carrega e faz cache do OpenAPI a partir de `swagger.yaml`. */
export function loadSwaggerSpec(): Record<string, unknown> {
  if (!cachedSpec) {
    const raw = readFileSync(SWAGGER_YAML_PATH, "utf8");
    cachedSpec = parse(raw) as Record<string, unknown>;
  }
  return cachedSpec;
}

export function getSwaggerYamlPath(): string {
  return SWAGGER_YAML_PATH;
}

export function readSwaggerYamlRaw(): string {
  return readFileSync(SWAGGER_YAML_PATH, "utf8");
}
