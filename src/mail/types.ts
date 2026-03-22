export interface FolderInfo {
  path: string;
  specialUse?: string;
}

export interface MessageSummary {
  uid: number;
  subject: string | null;
  from: string | null;
  date: string | null;
  seen: boolean;
}

export interface MessageDetail extends MessageSummary {
  to: string[] | null;
  text: string | null;
  rawPreview: string | null;
}

export interface SendEmailInput {
  to: string[];
  subject: string;
  text: string;
  html?: string;
  cc?: string[];
  bcc?: string[];
}

/** `profile`: mã hộp thư (vd `congty`). Bỏ qua → dùng profile mặc định trong cấu hình. */
export interface MailOperations {
  listProfiles(): Promise<{ id: string; isDefault: boolean }[]>;
  listFolders(profile?: string): Promise<FolderInfo[]>;
  listMessages(
    folder: string,
    options: { limit: number },
    profile?: string,
  ): Promise<MessageSummary[]>;
  getMessage(folder: string, uid: number, profile?: string): Promise<MessageDetail>;
  sendEmail(input: SendEmailInput, profile?: string): Promise<{ messageId: string }>;
}
