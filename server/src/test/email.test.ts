import { describe, expect, it } from 'vitest';
import { buildTransportOptions, headerSafe } from '../email/send.js';

describe('headerSafe', () => {
  it('rejects line breaks in email headers', () => {
    expect(() => headerSafe('Invoice\r\nBcc: attacker@example.com')).toThrow(
      'Email headers cannot contain line breaks',
    );
  });
});

describe('buildTransportOptions', () => {
  it('can skip STARTTLS for a trusted local relay with a self-signed certificate', () => {
    expect(
      buildTransportOptions({
        SMTP_HOST: '127.0.0.1',
        SMTP_PORT: 25,
        SMTP_SECURE: false,
        SMTP_IGNORE_TLS: true,
        SMTP_USER: '',
        SMTP_PASS: '',
      }),
    ).toEqual({
      host: '127.0.0.1',
      port: 25,
      secure: false,
      ignoreTLS: true,
      auth: undefined,
    });
  });

  it('keeps remote SMTP TLS negotiation enabled by default', () => {
    expect(
      buildTransportOptions({
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: 587,
        SMTP_SECURE: false,
        SMTP_IGNORE_TLS: false,
        SMTP_USER: 'factures@example.com',
        SMTP_PASS: 'secret',
      }),
    ).toEqual({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      ignoreTLS: false,
      auth: { user: 'factures@example.com', pass: 'secret' },
    });
  });
});
