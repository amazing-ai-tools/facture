# Facture

Facture is a private Google-authenticated invoice app for creating Quebec-style
consulting invoices, generating PDFs, and sending them to clients with Gmail.

## Frontend

- Cloud URL: https://facture.app.amazing-ai.tools
- Local dev: `npm run dev`
- Build: `npm run build`
- API base URL: `VITE_API_BASE_URL`
- BugZero app key: `VITE_BUGZERO_APP_KEY`

For local frontend configuration, copy `.env.example` to `.env` and adjust
values as needed. Vite only exposes variables prefixed with `VITE_`, so do not
put backend secrets in the frontend environment.

## Backend

- VPS API URL: https://facture.api.amazing-ai.tools
- Local dev: `cd server && npm run dev`
- Build: `cd server && npm run build`
- Apply schema: `cd server && npm run db:migrate`
- Health check: `GET /health`

For local backend configuration, copy `server/.env.example` to `server/.env`
and replace the placeholder values. The backend owns Google OAuth token
exchange, PostgreSQL access, invoice total calculation, PDF generation, and
Gmail sends.

## VPS Backend

Run the backend on the VPS with production environment variables equivalent to
`server/.env.example`:

- `NODE_ENV=production`
- `PORT=4000`
- `FRONTEND_ORIGIN=https://facture.app.amazing-ai.tools`
- `DATABASE_URL` for the VPS PostgreSQL database
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI=https://facture.api.amazing-ai.tools/auth/google/callback`
- `ALLOWED_GOOGLE_EMAILS` as a comma-separated allowlist for the Google
  accounts that may use this private workspace
- `SESSION_SECRET` with at least 32 random characters

Production secrets stay on the VPS and are not committed.

Deployment templates are in `ops/`:

- `ops/facture-api.service` for systemd
- `ops/facture.caddy` for Caddy reverse proxy

Copy them into `/etc/systemd/system/facture-api.service` and
`/etc/caddy/sites/facture.caddy` when the production database and
`/etc/facture/facture-api.env` are ready.

## Google OAuth

Configure the OAuth client in Google Cloud for the production frontend and API.

Authorized JavaScript origin:

- https://facture.app.amazing-ai.tools

Authorized redirect URI:

- https://facture.api.amazing-ai.tools/auth/google/callback

For local testing, add local origins and redirect URIs to a separate development
OAuth client when possible.

## Secret Handling

- Commit `.env.example` files only.
- Do not commit `.env`, `server/.env`, `facture.secrets`, database passwords,
  Google client secrets, session secrets, or deployment tokens.
- Frontend variables are public once built; keep secret-bearing values in the
  backend environment.
- Rotate any secret that is accidentally committed or shared outside the VPS.
