import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MailOperations } from "../mail/types.js";
import { buildZimbraToolHandlers } from "./tool-handlers.js";
import {
  getMessageInputSchema,
  listFoldersInputSchema,
  listMessagesInputSchema,
  sendEmailInputSchema,
} from "./tool-schemas.js";

export function registerZimbraTools(server: McpServer, client: MailOperations): void {
  const h = buildZimbraToolHandlers(client);

  server.registerTool(
    "zimbra_list_profiles",
    {
      description:
        "Liệt kê các hộp thư (profile) đã cấu hình — dùng khi có nhiều tài khoản mail trong một MCP. Mỗi profile có id riêng; truyền id đó vào tham số profile của tool khác.",
    },
    async () => h.zimbra_list_profiles(),
  );

  server.registerTool(
    "zimbra_list_folders",
    {
      description:
        "Liệt kê thư mục IMAP. Optional: profile — mã hộp thư khi cấu hình đa tài khoản.",
      inputSchema: listFoldersInputSchema,
    },
    async (args) => h.zimbra_list_folders(args),
  );

  server.registerTool(
    "zimbra_list_messages",
    {
      description:
        "Lấy danh sách thư gần nhất trong một hộp thư. Optional: profile. Tham số: folder, limit.",
      inputSchema: listMessagesInputSchema,
    },
    async (args) => h.zimbra_list_messages(args),
  );

  server.registerTool(
    "zimbra_get_message",
    {
      description: "Đọc một thư theo UID. Optional: profile. Tham số: folder, uid.",
      inputSchema: getMessageInputSchema,
    },
    async (args) => h.zimbra_get_message(args),
  );

  server.registerTool(
    "zimbra_send_email",
    {
      description:
        "Gửi email qua SMTP. Optional: profile — tài khoản gửi khi có nhiều hộp thư.",
      inputSchema: sendEmailInputSchema,
    },
    async (args) => h.zimbra_send_email(args),
  );
}
