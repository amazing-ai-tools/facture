import { describe, expect, it } from 'vitest';
import html from '../../index.html?raw';

describe('tracker integration', () => {
  it('identifies the Amazing AI product for the admin tracker', () => {
    const document = new DOMParser().parseFromString(html, 'text/html');

    expect(html).toContain('<meta name="product" content="amazing-ai">');
    expect(document.querySelector('meta[name="product"]')?.getAttribute('content')).toBe('amazing-ai');
    expect(document.querySelector('script[src="https://admin.api.amazing-ai.tools/tracker.js"]')).not.toBeNull();
  });
});
