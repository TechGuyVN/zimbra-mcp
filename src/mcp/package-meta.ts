import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

let cachedVersion: string | undefined;

function resolvePackageJsonPath(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, "package.json");
    if (existsSync(candidate)) {
      try {
        const raw = readFileSync(candidate, "utf8");
        const pkg = JSON.parse(raw) as { name?: string };
        if (pkg.name === "zimbra-mcp") return candidate;
      } catch {
        /* thử thư mục cha */
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("zimbra-mcp: không tìm thấy package.json của gói");
}

/** Phiên bản từ package.json (một bản ghi, tránh lệch với npm). */
export function getPackageVersion(): string {
  if (cachedVersion !== undefined) return cachedVersion;
  const raw = readFileSync(resolvePackageJsonPath(), "utf8");
  const pkg = JSON.parse(raw) as { version?: string };
  cachedVersion = typeof pkg.version === "string" ? pkg.version : "0.0.0";
  return cachedVersion;
}
