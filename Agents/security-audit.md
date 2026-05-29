# Security Audit - facture

Use this skill for security reviews.

## Current Risk Areas
- `.env` contains local secrets and must not be committed.
- Vite exposes `VITE_*` values to the browser; only public values belong there.
- BugZero widget loads a remote script at runtime.
- GitHub Actions uses deploy tokens and optional Cloudflare credentials.
- Dependencies and workflow actions need supply-chain review.

## Checklist
- Confirm `.gitignore` protects local secrets.
- Review environment variable names before adding new ones.
- Avoid placing private API tokens in frontend code.
- Check npm lockfile diffs for unexpected package changes.
- Validate third-party script changes and deployment action updates.
