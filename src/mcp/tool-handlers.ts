import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";
import type { MailOperations } from "../mail/types.js";
import {
  getMessageInputSchema,
  listFoldersInputSchema,
  listMessagesInputSchema,
  sendEmailInputSchema,
} from "./tool-schemas.js";

function jsonResult(data: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

function errorResult(message: string): CallToolResult {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

function catchToToolResult(e: unknown): CallToolResult {
  return errorResult(e instanceof Error ? e.message : String(e));
}

export function buildZimbraToolHandlers(client: MailOperations) {
  return {
    async zimbra_list_profiles(): Promise<CallToolResult> {
      try {
        const profiles = await client.listProfiles();
        return jsonResult({ profiles });
      } catch (e) {
        return catchToToolResult(e);
      }
    },

    async zimbra_list_folders(
      input: z.infer<typeof listFoldersInputSchema>,
    ): Promise<CallToolResult> {
      try {
        const parsed = listFoldersInputSchema.parse(input ?? {});
        const folders = await client.listFolders(parsed.profile);
        return jsonResult({
          profile: parsed.profile ?? null,
          defaultUsed: parsed.profile === undefined,
          folders,
        });
      } catch (e) {
        return catchToToolResult(e);
      }
    },

    async zimbra_list_messages(
      input: z.infer<typeof listMessagesInputSchema>,
    ): Promise<CallToolResult> {
      try {
        const parsed = listMessagesInputSchema.parse(input);
        const messages = await client.listMessages(
          parsed.folder,
          { limit: parsed.limit },
          parsed.profile,
        );
        return jsonResult({
          profile: parsed.profile ?? null,
          folder: parsed.folder,
          messages,
        });
      } catch (e) {
        return catchToToolResult(e);
      }
    },

    async zimbra_get_message(
      input: z.infer<typeof getMessageInputSchema>,
    ): Promise<CallToolResult> {
      try {
        const parsed = getMessageInputSchema.parse(input);
        const message = await client.getMessage(
          parsed.folder,
          parsed.uid,
          parsed.profile,
        );
        return jsonResult({ profile: parsed.profile ?? null, message });
      } catch (e) {
        return catchToToolResult(e);
      }
    },

    async zimbra_send_email(
      input: z.infer<typeof sendEmailInputSchema>,
    ): Promise<CallToolResult> {
      try {
        const parsed = sendEmailInputSchema.parse(input);
        const { profile, ...mail } = parsed;
        const result = await client.sendEmail(mail, profile);
        return jsonResult({ sent: true, profile: profile ?? null, ...result });
      } catch (e) {
        return catchToToolResult(e);
      }
    },
  };
}

export type ZimbraToolHandlers = ReturnType<typeof buildZimbraToolHandlers>;
