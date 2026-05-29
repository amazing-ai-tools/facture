import { describe, expect, it } from 'vitest';
import { productionApiBaseUrl, resolveApiBaseUrl } from '../api';

describe('api base URL', () => {
  it('uses the VPS API domain for deployed frontend hosts', () => {
    expect(resolveApiBaseUrl('', 'facture.app.amazing-ai.tools')).toBe(productionApiBaseUrl);
  });

  it('keeps localhost for local development', () => {
    expect(resolveApiBaseUrl('', 'localhost')).toBe('http://localhost:4000');
  });

  it('uses an explicit configured URL when provided', () => {
    expect(resolveApiBaseUrl('https://example.test/', 'facture.app.amazing-ai.tools')).toBe('https://example.test');
  });
});
