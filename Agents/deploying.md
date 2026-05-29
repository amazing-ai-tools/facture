# Deploying - facture

Use this skill for CI/CD and hosting changes.

## Deployment
- Workflow: `.github/workflows/deploy.yml`
- Trigger: push to `main` or manual dispatch
- Build: Node 22, `npm ci --include=dev`, `npm run build`
- Default deploy: Azure Static Web Apps
- Optional deploy: Cloudflare Pages via `HOSTING_PROVIDER=cloudflare_pages`

## Required Config
- Repo variables: `APP_DISPLAY_NAME`, `APP_DOMAIN`, `BUGZERO_APP_KEY`, `BUGZERO_WIDGET_URL`, `RUNNER_LABEL`
- Azure secret: `AZURE_STATIC_WEB_APPS_API_TOKEN`
- Cloudflare optional: `CLOUDFLARE_PROJECT_NAME`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`
- Planned runner label: `vps-facture`

## Rules
- Do not print secrets.
- Keep `dist` as the deployed app location.
- Test with `npm run build` before deploy workflow changes.
