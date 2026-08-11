export interface MailContent {
  readonly from: string;
  readonly to: string;
  readonly subject: string;
  readonly text: string;
}

export function renderMail(input: MailContent): string {
  const boundary = `factory-${randomUUID()}`;
  return [
    `From: ${input.from}`,
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    input.text,
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    textToHtml(input.text),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

function textToHtml(text: string): string {
  const escaped = escapeHtml(text);
  const linked = escaped.replace(/https?:\/\/[^\s<]+/g, (url) => {
    return `<a href="${url}" rel="noreferrer">${url}</a>`;
  });
  return `<!doctype html><html><body><p>${linked.replace(/\r?\n/g, "<br>")}</p></body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
import { randomUUID } from "node:crypto";
