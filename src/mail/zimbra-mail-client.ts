import { ImapFlow, type ImapFlowOptions } from "imapflow";
import nodemailer from "nodemailer";
import type { ZimbraRuntimeConfig } from "../config/load-config.js";
import { formatAddress, formatAddressList } from "./address-format.js";
import { extractPlainTextFromRfc822 } from "./rfc822-text.js";
import type {
  MailOperations,
  MessageDetail,
  MessageSummary,
  SendEmailInput,
} from "./types.js";

export class ZimbraMailClient implements MailOperations {
  constructor(private readonly runtime: ZimbraRuntimeConfig) {}

  listProfiles() {
    return Promise.resolve(
      this.runtime.profileIds.map((id) => ({
        id,
        isDefault: id === this.runtime.defaultProfileId,
      })),
    );
  }

  private imapOptions(profile: string | undefined): ImapFlowOptions {
    const m = this.runtime.getMailbox(profile).imap;
    return {
      host: m.host,
      port: m.port,
      secure: m.secure,
      auth: { user: m.user, pass: m.pass },
      logger: false,
    };
  }

  private async withImap<T>(
    profile: string | undefined,
    fn: (client: ImapFlow) => Promise<T>,
  ): Promise<T> {
    const client = new ImapFlow(this.imapOptions(profile));
    try {
      await client.connect();
      return await fn(client);
    } finally {
      try {
        await client.logout();
      } catch {
        /* ignore */
      }
    }
  }

  async listFolders(profile?: string) {
    return this.withImap(profile, async (client) => {
      const boxes = await client.list();
      return boxes.map((b) => ({
        path: b.path,
        specialUse: b.specialUse,
      }));
    });
  }

  async listMessages(folder: string, options: { limit: number }, profile?: string) {
    const cap = this.runtime.maxListMessages;
    const limit = Math.min(Math.max(1, options.limit), cap);
    return this.withImap(profile, async (client) => {
      const lock = await client.getMailboxLock(folder, { readOnly: true });
      try {
        const exists =
          client.mailbox && typeof client.mailbox === "object"
            ? client.mailbox.exists
            : 0;
        if (!exists) return [];
        const start = Math.max(1, exists - limit + 1);
        const range = `${start}:${exists}`;
        const rows: MessageSummary[] = [];
        for await (const msg of client.fetch(range, {
          envelope: true,
          uid: true,
          flags: true,
        })) {
          const env = msg.envelope;
          rows.push({
            uid: msg.uid,
            subject: env?.subject ?? null,
            from: formatAddress(env?.from),
            date: env?.date ? env.date.toISOString() : null,
            seen: Boolean(msg.flags?.has("\\Seen")),
          });
        }
        return rows;
      } finally {
        lock.release();
      }
    });
  }

  async getMessage(folder: string, uid: number, profile?: string) {
    return this.withImap(profile, async (client) => {
      const lock = await client.getMailboxLock(folder, { readOnly: true });
      try {
        const msg = await client.fetchOne(
          String(uid),
          {
            envelope: true,
            uid: true,
            flags: true,
            source: true,
          },
          { uid: true },
        );
        if (!msg) {
          throw new Error(`Không tìm thấy UID ${uid} trong ${folder}`);
        }
        const env = msg.envelope;
        const raw = msg.source?.toString("utf8") ?? "";
        const text = extractPlainTextFromRfc822(raw);
        const detail: MessageDetail = {
          uid: msg.uid,
          subject: env?.subject ?? null,
          from: formatAddress(env?.from),
          date: env?.date ? env.date.toISOString() : null,
          seen: Boolean(msg.flags?.has("\\Seen")),
          to: formatAddressList(env?.to),
          text,
          rawPreview: raw.length > 4000 ? `${raw.slice(0, 4000)}…` : raw || null,
        };
        return detail;
      } finally {
        lock.release();
      }
    });
  }

  async sendEmail(input: SendEmailInput, profile?: string) {
    const smtp = this.runtime.getMailbox(profile).smtp;
    const transport = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    });
    const info = await transport.sendMail({
      from: smtp.user,
      to: input.to.join(", "),
      cc: input.cc?.length ? input.cc.join(", ") : undefined,
      bcc: input.bcc?.length ? input.bcc.join(", ") : undefined,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return { messageId: info.messageId ?? "" };
  }
}
