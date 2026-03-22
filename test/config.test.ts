import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadZimbraConfig } from "../src/config/load-config.js";

const base = {
  ZIMBRA_IMAP_HOST: "imap.example.com",
  ZIMBRA_IMAP_USER: "u",
  ZIMBRA_IMAP_PASS: "p",
  ZIMBRA_SMTP_HOST: "smtp.example.com",
  ZIMBRA_SMTP_USER: "u",
  ZIMBRA_SMTP_PASS: "p",
};

describe("loadZimbraConfig", () => {
  it("chế độ env phẳng: một profile default", () => {
    const c = loadZimbraConfig({ ...base });
    const m = c.getMailbox();
    expect(m.imap.host).toBe("imap.example.com");
    expect(m.imap.port).toBe(993);
    expect(m.imap.secure).toBe(true);
    expect(m.smtp.port).toBe(587);
    expect(m.smtp.secure).toBe(false);
    expect(c.maxListMessages).toBe(200);
    expect(c.profileIds).toEqual(["default"]);
    expect(c.defaultProfileId).toBe("default");
  });

  it("ZIMBRA_LIST_MAX tùy chỉnh và clamp theo trần", () => {
    expect(loadZimbraConfig({ ...base, ZIMBRA_LIST_MAX: "500" }).maxListMessages).toBe(
      500,
    );
    expect(loadZimbraConfig({ ...base, ZIMBRA_LIST_MAX: "9999" }).maxListMessages).toBe(
      1000,
    );
    expect(loadZimbraConfig({ ...base, ZIMBRA_LIST_MAX: "0" }).maxListMessages).toBe(1);
  });

  it("bật TLS SMTP khi cổng 465 và không set ZIMBRA_SMTP_SECURE", () => {
    const c = loadZimbraConfig({
      ...base,
      ZIMBRA_SMTP_PORT: "465",
    });
    expect(c.getMailbox().smtp.secure).toBe(true);
  });

  it("ném lỗi khi thiếu biến môi trường bắt buộc (chế độ env)", () => {
    expect(() =>
      loadZimbraConfig({
        ZIMBRA_IMAP_HOST: "h",
        ZIMBRA_IMAP_USER: "u",
        ZIMBRA_IMAP_PASS: "p",
      } as NodeJS.ProcessEnv),
    ).toThrow(/Cấu hình Zimbra không hợp lệ/);
  });

  it("ZIMBRA_MAILBOXES_PATH: nhiều profile", () => {
    const dir = mkdtempSync(join(tmpdir(), "zimbra-mcp-"));
    const path = join(dir, "mb.json");
    writeFileSync(
      path,
      JSON.stringify({
        defaultProfile: "b",
        maxListMessages: 100,
        profiles: [
          {
            id: "a",
            imap: { host: "ia.test", user: "ua", pass: "pa" },
            smtp: { host: "sa.test", user: "ua", pass: "pa" },
          },
          {
            id: "b",
            imap: { host: "ib.test", port: 143, user: "ub", pass: "pb", secure: false },
            smtp: { host: "sb.test", user: "ub", pass: "pb" },
          },
        ],
      }),
      "utf8",
    );

    const c = loadZimbraConfig({
      ZIMBRA_MAILBOXES_PATH: path,
    } as NodeJS.ProcessEnv);

    expect(c.defaultProfileId).toBe("b");
    expect(c.profileIds).toEqual(["a", "b"]);
    expect(c.maxListMessages).toBe(100);
    expect(c.getMailbox("a").imap.host).toBe("ia.test");
    expect(c.getMailbox("b").imap.port).toBe(143);
    expect(() => c.getMailbox("x")).toThrow(/Không có hộp thư/);
  });
});
