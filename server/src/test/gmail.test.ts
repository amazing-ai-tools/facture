import { describe, expect, it } from 'vitest';
import { buildMimeMessage } from '../gmail/send.js';

describe('buildMimeMessage', () => {
  it('rejects line breaks in email headers', () => {
    expect(() =>
      buildMimeMessage({
        refreshToken: 'refresh-token',
        to: 'client@example.com',
        subject: 'Invoice\r\nBcc: attacker@example.com',
        body: 'Attached.',
        filename: 'invoice.pdf',
        pdf: Buffer.from('%PDF'),
      }),
    ).toThrow('Email headers cannot contain line breaks');
  });
});
