# Facture UI/UX Review - 2026-05-29

## Context

The current app is functional, but the interface reads like a generic generated admin dashboard. The product goal is a private invoicing app where a signed-in user manages multiple companies, selects the sending company, manages clients, creates factures, previews a PDF, and sends it through backend SMTP.

Reviewers:
- Galadriel: frontend and visual design
- Elrond: UX correctness and implementation risk
- Aragorn: product workflow and backlog

## Highest-Impact Findings

1. The workflow is too flat.
   - Company setup, client setup, invoice list, editor, and preview all compete for equal attention.
   - The primary job should be: choose company and client, build invoice, preview, send.

2. The visual language is generic.
   - Repeated white cards, navy sidebar, uppercase labels, 8px borders, and heavy small text make the UI feel template-generated.
   - Facture needs a more specific direction: document-first invoice studio, private billing office, or Quebec tax/accounting ledger.

3. The preview does not look like an invoice.
   - It is currently a placeholder card, not a trustworthy document preview.
   - It should show a paper-like invoice with sender, bill-to, dates, line items, taxes, payment terms, and total.

4. Multi-company context is present but not strong enough.
   - The app has a company selector and add-company flow.
   - The selected company should be a hard visible invoice context, shown in the editor and preview.
   - Switching company should clearly start a new invoice context or confirm if draft data would be abandoned.

5. Client selection is missing.
   - There is a client form, but no client list or selector.
   - Users need to choose an existing client before generating a facture and see the email before sending.

6. Error and pending states are weak.
   - Company save, invoice save, and send actions need loading states, double-submit protection, and visible failure messages.

7. The invoice editor accepts incomplete data.
   - Required fields, positive hours/rate validation, and bounded tax rates need field-level validation before save.

8. Mobile layout stacks mechanically.
   - On small screens, the app should become a guided workflow or tabs: Setup, Invoice, Preview, Send.
   - Current mobile view risks horizontal overflow and excessive scrolling.

## Recommended Redesign Direction

Use a document-first invoice studio:

- Left rail: account, company selector, recent invoices.
- Main pane: invoice editor with clear sections.
- Right pane: realistic live invoice preview and send readiness.
- Setup details: compact selected-company and selected-client cards with edit/add actions, not permanently expanded CRUD forms.
- Copy: use billing language, not implementation language.

Suggested copy changes:
- "Invoice operations" -> "Create facture"
- "Google authenticated workspace" -> "Private billing workspace"
- "Invoice list" -> "Recent factures"
- "PDF and send" -> "Preview and send"
- "Workspace loaded from the Facture API" -> "Your invoices are ready."

## Redesign Backlog

1. Add a guided first-run setup flow.
   - Acceptance: signed-out users see one Google login action; signed-in users without setup move through Company -> Client -> Invoice; invoice actions are disabled until prerequisites are complete.

2. Make company selection a hard invoice context.
   - Acceptance: selected company is always visible in editor and preview; creating an invoice requires an explicit saved company; switching company filters or separates that company's invoices.

3. Add real client management and client selection.
   - Acceptance: users can view saved clients, select one for a facture, add/edit clients without losing invoice work, and see the selected client email before sending.

4. Separate "new facture" from "edit selected facture".
   - Acceptance: "New facture" resets the editor; selected invoices open in edit mode; saving cannot accidentally overwrite another facture.

5. Replace placeholder preview with a document-like preview.
   - Acceptance: preview reflects company, client, dates, line items, taxes, totals, and payment terms; unavailable preview state explains what must be saved first.

6. Improve send-by-email workflow.
   - Acceptance: send state shows recipient, sender, subject, attachment name, confirmation, and actionable errors.

7. Add invoice lifecycle actions.
   - Acceptance: invoice list supports draft/sent/paid states; user can mark paid; user can delete/archive drafts with confirmation; list can filter by status.

8. Support real invoice line management.
   - Acceptance: user can add/remove lines with service date/range, hours, rate, description, and calculated totals.

9. Add validation and action states.
   - Acceptance: invalid fields block save with field-level errors; save/send buttons show pending states and prevent double-submit; tests cover failures.

10. Fix mobile as a workflow, not a stacked dashboard.
    - Acceptance: 320px viewport has no horizontal scroll; mobile uses tabs or steps; primary action remains easy to reach.

## Immediate UI Pass

The first implementation pass should not add more backend features. It should restructure the frontend around the invoice workflow:

1. Replace the top summary strip with a step/status bar.
2. Collapse company and client forms behind compact selection cards.
3. Add client selector.
4. Add explicit "New facture" action.
5. Upgrade the preview to a paper-style invoice surface.
6. Replace scaffold copy and generic visual styling.
7. Add basic validation and disabled states around save/preview/send.

