import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.js';

export const googleOAuthClient = new OAuth2Client(
  config.GOOGLE_CLIENT_ID,
  config.GOOGLE_CLIENT_SECRET,
  config.GOOGLE_REDIRECT_URI,
);

export interface GoogleProfile {
  googleSub: string;
  email: string;
  name: string;
  refreshToken: string | null;
}

export function buildGoogleAuthUrl(state: string) {
  return googleOAuthClient.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    state,
    scope: ['openid', 'email', 'profile'],
  });
}

export function isGoogleEmailAllowed(email: string, allowedEmails = config.ALLOWED_GOOGLE_EMAILS) {
  if (allowedEmails.length === 0) return true;
  return allowedEmails.includes(email.trim().toLowerCase());
}

export async function getGoogleProfile(code: string): Promise<GoogleProfile> {
  const { tokens } = await googleOAuthClient.getToken(code);

  if (!tokens.access_token) {
    throw new Error('Google token response is missing an access token');
  }

  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!response.ok) {
    throw new Error('Google profile request failed');
  }

  const data = (await response.json()) as { id?: string; email?: string; name?: string };

  if (!data.id || !data.email || !data.name) {
    throw new Error('Google profile is missing required fields');
  }

  return {
    googleSub: data.id,
    email: data.email,
    name: data.name,
    refreshToken: tokens.refresh_token ?? null,
  };
}
