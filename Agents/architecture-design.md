# Architecture Design - facture

Use this skill when deciding how `facture` should evolve beyond the provisioned static shell.

## Current Architecture
- Single-page Vite app bootstrapped from `src/main.tsx`
- Global CSS in `src/styles.css`
- Static deploy output in `dist`
- BugZero widget script injected client-side from Vite environment variables
- No backend, database, auth, routing, or API layer exists yet

## Guidance
- Keep the app static until a workflow needs persistence, secrets, auth, or background work.
- Introduce routing only when there are multiple meaningful screens.
- Introduce backend services behind a clear API contract and test strategy.
- Keep deploy targets compatible with Azure Static Web Apps and Cloudflare Pages unless the user chooses otherwise.
