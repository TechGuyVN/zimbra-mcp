/** Rút nội dung text/plain đơn giản từ RFC822 (không parse MIME đầy đủ). */
export function extractPlainTextFromRfc822(raw: string): string | null {
  const idx = raw.search(/\r?\n\r?\n/);
  if (idx === -1) return null;
  const body = raw.slice(idx).replace(/^\r?\n/, "");
  if (/^content-type:\s*multipart/im.test(raw.split(/\r?\n\r?\n/)[0] ?? "")) {
    const textMatch = body.match(
      /Content-Type:\s*text\/plain[^]*?\r?\n\r?\n([\s\S]*?)(?=\r?\n--|\r?\n\r?\nContent-Type:|$)/i,
    );
    if (textMatch?.[1]) {
      return decodeQuotedPrintableIfNeeded(textMatch[1].trim());
    }
    return null;
  }
  if (/text\/plain/i.test(raw)) {
    return decodeQuotedPrintableIfNeeded(body.trim());
  }
  return body.trim() || null;
}

function decodeQuotedPrintableIfNeeded(s: string): string {
  if (!/=[0-9A-F]{2}/i.test(s) && !/=\r?\n/.test(s)) return s;
  return s
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-F]{2})/gi, (_, h: string) =>
      String.fromCharCode(parseInt(h, 16)),
    );
}
