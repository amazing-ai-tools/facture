# Facture Product Spec

## Goal

Facture is a private invoice management app for a consulting company. A user signs in with Google, registers company data, creates Quebec-style invoices matching the provided sample PDF, sends invoice PDFs to clients by Gmail, and tracks invoice status.

## Runtime Shape

- Frontend: Vite, React, TypeScript, hosted at `https://facture.app.amazing-ai.tools`.
- Backend: Node.js, Express, TypeScript, hosted on the VPS at `https://facture.api.amazing-ai.tools`.
- Database: PostgreSQL on the VPS.
- Auth: Google OAuth 2.0. The OAuth JavaScript origin is `https://facture.app.amazing-ai.tools`.
- Email: Gmail API using the signed-in Google account.
- PDF: Server-side invoice PDF generation matching the uploaded Quebec invoice layout.

## Data Model

- User: Google account identity and email.
- Company: legal name, company number, address, GST/TPS registration, QST/TVQ registration, default hourly rate, payment terms.
- Client: company name, contact email, billing address, optional document/reference fields.
- Invoice: invoice number, invoice date, service date range, resource name, payment terms, status, client, company, totals.
- Invoice line: description, service date, quantity, unit rate, subtotal.
- Email delivery: recipient, subject, message, Gmail message id, sent timestamp.

## MVP Workflow

1. User opens the cloud frontend and signs in with Google.
2. Backend verifies the Google identity and creates or updates the user.
3. User enters company profile and tax registration data.
4. User creates a client.
5. User creates an invoice with labour lines, hours, rate, GST/TPS, and QST/TVQ.
6. Backend calculates totals and generates a PDF preview.
7. User sends the invoice PDF to the client through Gmail.
8. Invoice status moves from draft to sent, then can be marked paid manually.

## Security Boundaries

- `facture.secrets` stays local and ignored by git.
- Google client secret, refresh tokens, database URL, and Gmail credentials stay on the VPS backend.
- The frontend receives only public configuration such as `VITE_API_BASE_URL=https://facture.api.amazing-ai.tools`.
- API routes require a valid application session.
- CORS allows `https://facture.app.amazing-ai.tools` and local development origins only.

## Open Deployment Inputs

- VPS service manager convention for this project: systemd service or PM2 process.
- PostgreSQL database name and local user policy.
- Reverse proxy route for `facture.api.amazing-ai.tools`.
