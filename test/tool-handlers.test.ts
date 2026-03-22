import { describe, expect, it, vi } from "vitest";
import { buildZimbraToolHandlers } from "../src/mcp/tool-handlers.js";
import type { MailOperations } from "../src/mail/types.js";

function textPayload(result: { content: { type: string; text: string }[] }) {
  return result.content[0]?.text ?? "";
}

function emptyProfilesClient(overrides: Partial<MailOperations> = {}): MailOperations {
  return {
    listProfiles: vi.fn().mockResolvedValue([{ id: "default", isDefault: true }]),
    listFolders: vi.fn(),
    listMessages: vi.fn(),
    getMessage: vi.fn(),
    sendEmail: vi.fn(),
    ...overrides,
  };
}

describe("buildZimbraToolHandlers", () => {
  it("zimbra_list_profiles trả về danh sách profile", async () => {
    const client = emptyProfilesClient({
      listProfiles: vi.fn().mockResolvedValue([
        { id: "a", isDefault: false },
        { id: "b", isDefault: true },
      ]),
    });
    const h = buildZimbraToolHandlers(client);
    const res = await h.zimbra_list_profiles();
    const data = JSON.parse(textPayload(res));
    expect(data.profiles).toHaveLength(2);
  });

  it("zimbra_list_folders trả về JSON danh sách thư mục", async () => {
    const client = emptyProfilesClient({
      listFolders: vi
        .fn()
        .mockResolvedValue([{ path: "INBOX", specialUse: "\\Inbox" }]),
    });
    const h = buildZimbraToolHandlers(client);
    const res = await h.zimbra_list_folders({});
    expect(res.isError).not.toBe(true);
    const data = JSON.parse(textPayload(res));
    expect(data.folders).toHaveLength(1);
    expect(data.folders[0].path).toBe("INBOX");
  });

  it("zimbra_list_messages gọi client với limit và profile", async () => {
    const listMessages = vi.fn().mockResolvedValue([]);
    const client = emptyProfilesClient({ listMessages });
    const h = buildZimbraToolHandlers(client);
    await h.zimbra_list_messages({ folder: "INBOX", limit: 5 });
    expect(listMessages).toHaveBeenCalledWith("INBOX", { limit: 5 }, undefined);
    await h.zimbra_list_messages({ folder: "Sent", limit: 3, profile: "work" });
    expect(listMessages).toHaveBeenCalledWith("Sent", { limit: 3 }, "work");
  });

  it("zimbra_get_message trả về nội dung thư", async () => {
    const client = emptyProfilesClient({
      getMessage: vi.fn().mockResolvedValue({
        uid: 9,
        subject: "Hi",
        from: "a@b.c",
        date: "2025-01-01T00:00:00.000Z",
        seen: true,
        to: ["x@y.z"],
        text: "Hello",
        rawPreview: "Subject: Hi\n\nHello",
      }),
    });
    const h = buildZimbraToolHandlers(client);
    const res = await h.zimbra_get_message({ folder: "INBOX", uid: 9 });
    const data = JSON.parse(textPayload(res));
    expect(data.message.subject).toBe("Hi");
  });

  it("zimbra_send_email trả về messageId", async () => {
    const sendEmail = vi.fn().mockResolvedValue({ messageId: "<id@mail>" });
    const client = emptyProfilesClient({ sendEmail });
    const h = buildZimbraToolHandlers(client);
    const res = await h.zimbra_send_email({
      to: ["to@example.com"],
      subject: "S",
      text: "Body",
    });
    expect(sendEmail).toHaveBeenCalledWith(
      { to: ["to@example.com"], subject: "S", text: "Body" },
      undefined,
    );
    const data = JSON.parse(textPayload(res));
    expect(data.sent).toBe(true);
    expect(data.messageId).toBe("<id@mail>");
  });

  it("ghi isError khi client ném lỗi", async () => {
    const client = emptyProfilesClient({
      listFolders: vi.fn().mockRejectedValue(new Error("IMAP down")),
    });
    const h = buildZimbraToolHandlers(client);
    const res = await h.zimbra_list_folders({});
    expect(res.isError).toBe(true);
    expect(textPayload(res)).toContain("IMAP down");
  });
});
