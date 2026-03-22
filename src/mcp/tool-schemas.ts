import { z } from "zod";
import { ZIMBRA_LIST_MESSAGES_HARD_CAP } from "../constants.js";

/** Mã hộp thư khi dùng file đa profile (vd `congty`). Bỏ qua = profile mặc định. */
export const profileFieldSchema = z
  .string()
  .min(1)
  .optional()
  .describe("Mã profile hộp thư (khi cấu hình nhiều hộp). Không gửi = dùng mặc định.");

export const listMessagesInputSchema = z.object({
  profile: profileFieldSchema,
  folder: z.string().min(1).describe("Đường dẫn hộp thư IMAP (vd: INBOX)"),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(ZIMBRA_LIST_MESSAGES_HARD_CAP)
    .optional()
    .default(20),
});

export const getMessageInputSchema = z.object({
  profile: profileFieldSchema,
  folder: z.string().min(1),
  uid: z.coerce.number().int().positive(),
});

export const sendEmailInputSchema = z.object({
  profile: profileFieldSchema,
  to: z.array(z.string().email()).min(1),
  subject: z.string().min(1),
  text: z.string(),
  html: z.string().optional(),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
});

export const listFoldersInputSchema = z.object({
  profile: profileFieldSchema,
});
