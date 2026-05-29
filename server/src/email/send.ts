import nodemailer from 'nodemailer';
import { config } from '../config.js';

export interface SendInvoiceEmailInput {
  to: string;
  subject: string;
  body: string;
  filename: string;
  pdf: Uint8Array;
}

export async function sendInvoiceEmail(input: SendInvoiceEmailInput) {
  const transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE,
    auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined,
  });

  return transporter.sendMail({
    from: config.SMTP_FROM,
    to: headerSafe(input.to),
    subject: headerSafe(input.subject),
    text: input.body,
    attachments: [
      {
        filename: headerSafe(input.filename).replace(/"/g, "'"),
        content: Buffer.from(input.pdf),
        contentType: 'application/pdf',
      },
    ],
  });
}

export function headerSafe(value: string) {
  if (/[\r\n]/.test(value)) {
    throw new Error('Email headers cannot contain line breaks');
  }

  return value;
}
