import { describe, expect, it } from 'vitest';
import { headerSafe } from '../email/send.js';

describe('headerSafe', () => {
  it('rejects line breaks in email headers', () => {
    expect(() => headerSafe('Invoice\r\nBcc: attacker@example.com')).toThrow(
      'Email headers cannot contain line breaks',
    );
  });
});
