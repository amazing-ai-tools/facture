import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type ErrorRequestHandler, type NextFunction, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { ZodError } from 'zod';
import { buildGoogleAuthUrl, getGoogleProfile, isGoogleEmailAllowed } from './auth/google.js';
import {
  clearOAuthStateCookie,
  getSession,
  readOAuthStateCookie,
  setOAuthStateCookie,
  setSessionCookie,
} from './auth/session.js';
import { config } from './config.js';
import { query } from './db.js';
import { invoiceRouter } from './invoices/routes.js';
import { profileRouter } from './profiles/routes.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.FRONTEND_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/health', (_request, response) => {
    response.json({ ok: true, service: 'facture-api' });
  });

  app.get('/auth/google/start', (_request, response) => {
    const state = crypto.randomUUID();
    setOAuthStateCookie(response, state);
    response.redirect(buildGoogleAuthUrl(state));
  });

  app.get('/auth/google/callback', asyncHandler(async (request, response) => {
    try {
      const code = typeof request.query.code === 'string' ? request.query.code : null;
      const state = typeof request.query.state === 'string' ? request.query.state : null;
      const expectedState = readOAuthStateCookie(request);
      clearOAuthStateCookie(response);

      if (!code || !state || !expectedState || state !== expectedState) {
        response.status(400).json({ error: 'Invalid Google authorization response' });
        return;
      }

      const profile = await getGoogleProfile(code);
      if (!isGoogleEmailAllowed(profile.email)) {
        response.status(403).json({ error: 'Google account is not allowed for this Facture workspace' });
        return;
      }

      const result = await query<{ id: string; email: string }>(
        `
          INSERT INTO users (google_sub, email, name, refresh_token)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (google_sub) DO UPDATE
          SET
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            refresh_token = COALESCE(EXCLUDED.refresh_token, users.refresh_token)
          RETURNING id, email
        `,
        [profile.googleSub, profile.email, profile.name, profile.refreshToken],
      );

      const user = result.rows[0];
      setSessionCookie(response, { userId: user.id, email: user.email });
      response.redirect(config.FRONTEND_ORIGIN);
    } catch (error) {
      throw error;
    }
  }));

  app.get('/me', (request, response) => {
    const session = getSession(request);
    if (!session) {
      response.status(401).json({ error: 'Authentication required' });
      return;
    }

    response.json({ user: { id: session.userId, email: session.email } });
  });

  app.use('/invoices', invoiceRouter);
  app.use('/', profileRouter);
  app.use(errorHandler);

  return app;
}

export function asyncHandler(
  handler: (request: Request, response: Response, next: NextFunction) => Promise<void>,
) {
  return (request: Request, response: Response, next: NextFunction) => {
    handler(request, response, next).catch(next);
  };
}

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({ error: 'Invalid request body', issues: error.issues });
    return;
  }

  if (isDuplicateInvoiceNumberError(error)) {
    response.status(409).json({ error: 'Invoice number already exists. Create a new facture number before saving.' });
    return;
  }

  console.error(error);
  response.status(500).json({ error: 'Internal server error' });
};

function isDuplicateInvoiceNumberError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'constraint' in error &&
    (error as { code?: unknown }).code === '23505' &&
    (error as { constraint?: unknown }).constraint === 'invoices_user_id_invoice_number_key'
  );
}
