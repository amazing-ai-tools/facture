# Quebec Invoice Compliance Review

Date: 2026-06-01

Scope: Facture invoices for Quebec consulting/labour services where GST/TPS and QST/TVQ are charged and the total is normally over $500.

## Official Requirements Checked

Revenu Quebec says there is no special invoice format required for the GST/QST systems for ordinary businesses, outside sector-specific mandatory billing such as restaurants and taxi operators. For ITC/ITR support, the invoice or supporting documents must carry required information by sale value.

For a sale of $500 or more including tax, the Revenu Quebec table requires:

- supplier name or business/trade name
- invoice date, or date when GST/QST is paid or payable
- total invoice amount
- applicable tax amount
- supplier GST and QST registration numbers
- buyer name or trade name
- payment terms
- description that identifies the good or service

CRA GST/HST ITC documentation uses similar thresholds and, for $500 or more, requires supplier name, invoice date, total amount, GST/HST charged or included, supplier GST/HST number, buyer name, description, and payment terms.

Sources:

- Revenu Quebec, "Preparation des factures": https://www.revenuquebec.ca/fr/entreprises/taxes/tpstvh-et-tvq/perception-de-la-tps-et-de-la-tvq/preparation-des-factures/
- Revenu Quebec, "Showing the Taxes": https://www.revenuquebec.ca/en/businesses/consumption-taxes/gsthst-and-qst/collecting-gst-and-qst/showing-the-taxes/
- CRA, "Input tax credit information requirements": https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/calculate-prepare-report/input-tax-credit.html

## Current App Result

The app now blocks PDF generation and email sending until the following fields are complete:

- supplier name
- GST/TPS registration number
- QST/TVQ registration number
- client name
- payment terms
- service description
- positive total payable

The PDF includes invoice number, invoice date, supplier, client, service line, quantity/rate/amount, GST/TPS, QST/TVQ, subtotal, total payable, and payment terms.

## Remaining Non-Legal Product Notes

- Draft saves are still allowed with incomplete company/client data so users can build records progressively.
- The app does not verify tax registration numbers against government registries; it only requires that values are present before issuing.
- This review is implementation guidance, not legal/accounting advice. A Quebec CPA should confirm edge cases such as exempt supplies, zero-rated supplies, non-Quebec clients, and sector-specific mandatory billing.
