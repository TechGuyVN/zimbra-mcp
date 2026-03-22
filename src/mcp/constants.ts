import { getPackageVersion } from "./package-meta.js";

export const MCP_SERVER_NAME = "zimbra-mail";

export function getMcpServerVersion(): string {
  return getPackageVersion();
}
