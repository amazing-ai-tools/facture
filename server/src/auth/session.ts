import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { config } from '../config.js';

export interface SessionPayload {
  userId: string;
  email: string;
}

export const sessionCookieName = 'facture_session';
export const oauthStateCookieName = 'facture_oauth_state';

function sign(value: string) {
  return crypto.createHmac('sha256', config.SESSION_SECRET).update(value).digest('base64url');
}

function timingSafeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function createSessionToken(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function readSessionToken(token: string): SessionPayload | null {
  const [body, signature] = token.split('.');
  if (!body || !signature || !timingSafeEqual(sign(body), signature)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
  } catch {
    return null;
  }
}

export function setSessionCookie(response: Response, payload: SessionPayload) {
  response.cookie(sessionCookieName, createSessionToken(payload), {
    httpOnly: true,
    sameSite: 'none',
    secure: config.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });
}

export function getSession(request: Request) {
  const token = request.cookies?.[sessionCookieName];
  return typeof token === 'string' ? readSessionToken(token) : null;
}

export function createSignedValue(value: string) {
  return `${value}.${sign(value)}`;
}

export function readSignedValue(token: string) {
  const separatorIndex = token.lastIndexOf('.');
  if (separatorIndex <= 0) return null;

  const value = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  return timingSafeEqual(sign(value), signature) ? value : null;
}

export function setOAuthStateCookie(response: Response, state: string) {
  response.cookie(oauthStateCookieName, createSignedValue(state), {
    httpOnly: true,
    sameSite: 'none',
    secure: config.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 10,
  });
}

export function readOAuthStateCookie(request: Request) {
  const token = request.cookies?.[oauthStateCookieName];
  return typeof token === 'string' ? readSignedValue(token) : null;
}

export function clearOAuthStateCookie(response: Response) {
  response.clearCookie(oauthStateCookieName, {
    httpOnly: true,
    sameSite: 'none',
    secure: config.NODE_ENV === 'production',
  });
}
