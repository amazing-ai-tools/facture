# Frontend Testing - facture

Use this skill for verifying browser-facing behavior.

## Current Baseline
- `npm run build` runs TypeScript and Vite production build
- No unit or E2E framework is installed yet

## What To Check
- TypeScript remains strict and clean.
- BugZero script is injected only when `VITE_BUGZERO_APP_KEY` exists.
- Environment-driven app name and domain render correctly.
- Layout works on mobile and desktop.
- Links point to production and BugZero dashboard as intended.

## Future Additions
- Add Vitest/React Testing Library for component behavior once components are split.
- Add Playwright for smoke tests when real user flows exist.
