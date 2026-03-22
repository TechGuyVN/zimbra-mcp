/**
 * MCP stdio: chỉ ghi log lỗi khởi động ra stderr — stdout dành cho JSON-RPC.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadZimbraConfig, ZimbraConfigError } from "./config/load-config.js";
import { ZimbraMailClient } from "./mail/zimbra-mail-client.js";
import { getMcpServerVersion, MCP_SERVER_NAME } from "./mcp/constants.js";
import { registerZimbraTools } from "./mcp/register-tools.js";

async function main() {
  const config = loadZimbraConfig();
  const mail = new ZimbraMailClient(config);

  const server = new McpServer(
    { name: MCP_SERVER_NAME, version: getMcpServerVersion() },
    {
      instructions:
        "Công cụ đọc/ghi thư qua IMAP/SMTP cho Zimbra (hoặc mail server tương thích). Biến môi trường: ZIMBRA_IMAP_*, ZIMBRA_SMTP_*.",
    },
  );

  registerZimbraTools(server, mail);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  const message =
    err instanceof ZimbraConfigError
      ? err.message
      : err instanceof Error
        ? err.message
        : String(err);
  console.error("[zimbra-mcp]", message);
  process.exitCode = 1;
});
