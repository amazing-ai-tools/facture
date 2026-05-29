import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildGoogleAuthUrl, isGoogleEmailAllowed } from '../auth/google.js';
import { createSessionToken } from '../auth/session.js';
import { createApp } from '../app.js';

describe('buildGoogleAuthUrl', () => {
  it('requests identity and Gmail send scopes', () => {
    const url = new URL(buildGoogleAuthUrl('state-123'));

    expect(url.hostname).toBe('accounts.google.com');
    expect(url.searchParams.get('scope')).toContain('openid');
    expect(url.searchParams.get('scope')).toContain('email');
    expect(url.searchParams.get('scope')).toContain('https://www.googleapis.com/auth/gmail.send');
    expect(url.searchParams.get('state')).toBe('state-123');
  });
});

describe('isGoogleEmailAllowed', () => {
  it('allows every Google account when no allowlist is configured', () => {
    expect(isGoogleEmailAllowed('client@example.com', [])).toBe(true);
  });

  it('allows only configured Google account emails when an allowlist is configured', () => {
    expect(isGoogleEmailAllowed('Owner@Example.com', ['owner@example.com'])).toBe(true);
    expect(isGoogleEmailAllowed('client@example.com', ['owner@example.com'])).toBe(false);
  });
});

describe('me route', () => {
  it('returns the current session user', async () => {
    const app = createApp();
    const token = createSessionToken({ userId: 'user-123', email: 'user@example.com' });

    const response = await request(app).get('/me').set('Cookie', [`facture_session=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user: { id: 'user-123', email: 'user@example.com' } });
  });
});

describe('Google callback state validation', () => {
  it('rejects callbacks without a matching OAuth state cookie', async () => {
    const app = createApp();

    const response = await request(app).get('/auth/google/callback?code=code-123&state=state-123');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid Google authorization response' });
  });
});
