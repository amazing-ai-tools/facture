// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

function ruleBody(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = styles.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`));

  return match?.[1] ?? '';
}

describe('supplier card styles', () => {
  it('keeps the selected company summary compact on desktop', () => {
    expect(ruleBody('.supplier-card-title')).toContain('font-size: 0.78rem');
    expect(ruleBody('.supplier-card strong')).toContain('font-size: clamp(1rem, 1.5vw, 1.16rem)');
    expect(ruleBody('.supplier-card p')).toContain('font-size: clamp(0.78rem, 1vw, 0.9rem)');
    expect(ruleBody('.supplier-card p')).toContain('white-space: nowrap');
    expect(ruleBody('.supplier-card p')).toContain('overflow-wrap: normal');
    expect(ruleBody('.supplier-card p')).toContain('word-break: normal');
    expect(styles).toContain(`.supplier-card p {
    white-space: normal;
    overflow-wrap: anywhere;
  }`);
  });
});
