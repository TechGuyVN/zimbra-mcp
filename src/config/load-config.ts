import { readFileSync } from "node:fs";
import { z } from "zod";
import { ZIMBRA_LIST_MESSAGES_HARD_CAP } from "../constants.js";

const imapBlockSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive().optional(),
  user: z.string().min(1),
  pass: z.string().min(1),
  secure: z.boolean().optional(),
});

const smtpBlockSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive().optional(),
  user: z.string().min(1),
  pass: z.string().min(1),
  secure: z.boolean().optional(),
});

const mailboxesFileSchema = z.object({
  defaultProfile: z.string().min(1).optional(),
  maxListMessages: z
    .number()
    .int()
    .min(1)
    .max(ZIMBRA_LIST_MESSAGES_HARD_CAP)
    .optional(),
  profiles: z
    .array(
      z.object({
        id: z.string().min(1),
        imap: imapBlockSchema,
        smtp: smtpBlockSchema,
      }),
    )
    .min(1),
});

const flatEnvSchema = z.object({
  ZIMBRA_IMAP_HOST: z.string().min(1),
  ZIMBRA_IMAP_PORT: z.coerce.number().int().positive().default(993),
  ZIMBRA_IMAP_USER: z.string().min(1),
  ZIMBRA_IMAP_PASS: z.string().min(1),
  ZIMBRA_IMAP_SECURE: z.enum(["true", "false"]).optional(),

  ZIMBRA_SMTP_HOST: z.string().min(1),
  ZIMBRA_SMTP_PORT: z.coerce.number().int().positive().default(587),
  ZIMBRA_SMTP_USER: z.string().min(1),
  ZIMBRA_SMTP_PASS: z.string().min(1),
  ZIMBRA_SMTP_SECURE: z.enum(["true", "false"]).optional(),

  ZIMBRA_LIST_MAX: z.coerce.number().int().min(0).optional(),
});

const fileEnvSchema = z.object({
  ZIMBRA_LIST_MAX: z.coerce.number().int().min(0).optional(),
});

export interface ZimbraMailboxConfig {
  imap: {
    host: string;
    port: number;
    user: string;
    pass: string;
    secure: boolean;
  };
  smtp: {
    host: string;
    port: number;
    user: string;
    pass: string;
    secure: boolean;
  };
}

export interface ZimbraRuntimeConfig {
  maxListMessages: number;
  readonly defaultProfileId: string;
  readonly profileIds: readonly string[];
  getMailbox(profileId?: string): ZimbraMailboxConfig;
}

export class ZimbraConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZimbraConfigError";
  }
}

function clampListMax(raw: number | undefined, fallback: number): number {
  const base = raw === undefined ? fallback : raw;
  return Math.min(ZIMBRA_LIST_MESSAGES_HARD_CAP, Math.max(1, Math.floor(base)));
}

function normalizeImap(
  b: z.infer<typeof imapBlockSchema>,
): ZimbraMailboxConfig["imap"] {
  const port = b.port ?? 993;
  const secure = b.secure ?? port === 993;
  return {
    host: b.host,
    port,
    user: b.user,
    pass: b.pass,
    secure,
  };
}

function normalizeSmtp(
  b: z.infer<typeof smtpBlockSchema>,
): ZimbraMailboxConfig["smtp"] {
  const port = b.port ?? 587;
  const secure = b.secure ?? port === 465;
  return {
    host: b.host,
    port,
    user: b.user,
    pass: b.pass,
    secure,
  };
}

function buildRuntime(
  profiles: Record<string, ZimbraMailboxConfig>,
  defaultProfileId: string,
  maxListMessages: number,
): ZimbraRuntimeConfig {
  const profileIds = Object.keys(profiles).sort();
  if (profileIds.length === 0) {
    throw new ZimbraConfigError("Cần ít nhất một profile hộp thư.");
  }
  if (!profiles[defaultProfileId]) {
    throw new ZimbraConfigError(
      `defaultProfile "${defaultProfileId}" không tồn tại trong danh sách profiles.`,
    );
  }

  return {
    maxListMessages,
    defaultProfileId,
    profileIds,
    getMailbox(profileId?: string): ZimbraMailboxConfig {
      const id = profileId?.trim() || defaultProfileId;
      const m = profiles[id];
      if (!m) {
        throw new ZimbraConfigError(
          `Không có hộp thư "${id}". Có sẵn: ${profileIds.join(", ")}`,
        );
      }
      return m;
    },
  };
}

function loadFromFlatEnv(env: NodeJS.ProcessEnv): ZimbraRuntimeConfig {
  const parsed = flatEnvSchema.safeParse(env);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new ZimbraConfigError(`Cấu hình Zimbra không hợp lệ: ${msg}`);
  }
  const c = parsed.data;
  const imapSecure =
    c.ZIMBRA_IMAP_SECURE === undefined
      ? c.ZIMBRA_IMAP_PORT === 993
      : c.ZIMBRA_IMAP_SECURE === "true";
  const smtpSecure =
    c.ZIMBRA_SMTP_SECURE === undefined
      ? c.ZIMBRA_SMTP_PORT === 465
      : c.ZIMBRA_SMTP_SECURE === "true";

  const mailbox: ZimbraMailboxConfig = {
    imap: {
      host: c.ZIMBRA_IMAP_HOST,
      port: c.ZIMBRA_IMAP_PORT,
      user: c.ZIMBRA_IMAP_USER,
      pass: c.ZIMBRA_IMAP_PASS,
      secure: imapSecure,
    },
    smtp: {
      host: c.ZIMBRA_SMTP_HOST,
      port: c.ZIMBRA_SMTP_PORT,
      user: c.ZIMBRA_SMTP_USER,
      pass: c.ZIMBRA_SMTP_PASS,
      secure: smtpSecure,
    },
  };

  const maxList = clampListMax(c.ZIMBRA_LIST_MAX, 200);
  return buildRuntime({ default: mailbox }, "default", maxList);
}

function loadFromMailboxesFile(
  filePath: string,
  env: NodeJS.ProcessEnv,
): ZimbraRuntimeConfig {
  let rawJson: unknown;
  try {
    rawJson = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  } catch (e) {
    throw new ZimbraConfigError(
      `Không đọc được ZIMBRA_MAILBOXES_PATH (${filePath}): ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  const parsed = mailboxesFileSchema.safeParse(rawJson);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new ZimbraConfigError(`File mailboxes JSON không hợp lệ: ${msg}`);
  }

  const data = parsed.data;
  const seen = new Set<string>();
  const profiles: Record<string, ZimbraMailboxConfig> = {};
  for (const p of data.profiles) {
    if (seen.has(p.id)) {
      throw new ZimbraConfigError(`Trùng id profile: "${p.id}"`);
    }
    seen.add(p.id);
    profiles[p.id] = {
      imap: normalizeImap(p.imap),
      smtp: normalizeSmtp(p.smtp),
    };
  }

  const defaultId = data.defaultProfile ?? data.profiles[0].id;
  const envParsed = fileEnvSchema.safeParse(env);
  const envListMax = envParsed.success ? envParsed.data.ZIMBRA_LIST_MAX : undefined;
  const fileListMax = data.maxListMessages ?? 200;
  const maxList = clampListMax(envListMax, fileListMax);

  return buildRuntime(profiles, defaultId, maxList);
}

/**
 * Flat env: `ZIMBRA_IMAP_*`, `ZIMBRA_SMTP_*` → profile `default`.
 * Multi-mailbox: set `ZIMBRA_MAILBOXES_PATH` to a JSON file (see `mailboxes.example.json`).
 */
export function loadZimbraConfig(
  env: NodeJS.ProcessEnv = process.env,
): ZimbraRuntimeConfig {
  const path = env.ZIMBRA_MAILBOXES_PATH?.trim();
  if (path) {
    return loadFromMailboxesFile(path, env);
  }
  return loadFromFlatEnv(env);
}
