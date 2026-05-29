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
  const transporter = nodemailer.createTransport(buildTransportOptions());

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

interface SmtpConfig {
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;
  SMTP_IGNORE_TLS: boolean;
  SMTP_USER: string;
  SMTP_PASS: string;
}

export function buildTransportOptions(smtp: SmtpConfig = config) {
  return {
    host: smtp.SMTP_HOST,
    port: smtp.SMTP_PORT,
    secure: smtp.SMTP_SECURE,
    ignoreTLS: smtp.SMTP_IGNORE_TLS,
    auth: smtp.SMTP_USER ? { user: smtp.SMTP_USER, pass: smtp.SMTP_PASS } : undefined,
  };
}

export function headerSafe(value: string) {
  if (/[\r\n]/.test(value)) {
    throw new Error('Email headers cannot contain line breaks');
  }

  return value;
}
