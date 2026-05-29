import { OAuth2Client } from 'google-auth-library';
import { gmail_v1, google } from 'googleapis';
import { config } from '../config.js';

export interface SendInvoiceEmailInput {
  refreshToken: string;
  to: string;
  subject: string;
  body: string;
  filename: string;
  pdf: Uint8Array;
}

export async function sendInvoiceEmail(input: SendInvoiceEmailInput) {
  const auth = new OAuth2Client(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    config.GOOGLE_REDIRECT_URI,
  );
  auth.setCredentials({ refresh_token: input.refreshToken });

  const gmail = google.gmail({ version: 'v1', auth });
  const raw = buildMimeMessage(input);
  const response = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
  return response.data as gmail_v1.Schema$Message;
}

export function buildMimeMessage(input: SendInvoiceEmailInput) {
  const boundary = `facture_${Date.now()}`;
  const pdfBase64 = Buffer.from(input.pdf).toString('base64');
  const to = headerSafe(input.to);
  const subject = headerSafe(input.subject);
  const filename = headerSafe(input.filename).replace(/"/g, "'");
  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    input.body,
    '',
    `--${boundary}`,
    `Content-Type: application/pdf; name="${filename}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${filename}"`,
    '',
    pdfBase64,
    `--${boundary}--`,
  ].join('\r\n');

  return Buffer.from(message).toString('base64url');
}

function headerSafe(value: string) {
  if (/[\r\n]/.test(value)) {
    throw new Error('Email headers cannot contain line breaks');
  }

  return value;
}
