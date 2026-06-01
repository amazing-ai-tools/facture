import { Calculator, Save } from 'lucide-react';
import React from 'react';
import type { InvoiceDraft, InvoiceTotals } from '../types';

interface InvoiceEditorProps {
  draft?: InvoiceDraft;
  onSave: (draft: InvoiceDraft) => void;
  onDraftChange?: (draft: InvoiceDraft, totals: InvoiceTotals) => void;
}

const defaultDraft: InvoiceDraft = {
  invoiceNumber: 'FAC-2026-001',
  language: 'fr-QC',
  documentReference: 'May consulting services',
  serviceDate: '2026-05-29',
  resourceName: 'Senior consultant',
  paymentTerms: 'MOIS-SUIV',
  description: 'Product engineering and delivery support',
  hours: 40.5,
  hourlyRate: 94,
  gstRate: 5,
  qstRate: 9.975,
};

const currencyFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
});

export function calculateInvoiceTotals(draft: InvoiceDraft): InvoiceTotals {
  const subtotalCents = Math.round(draft.hours * draft.hourlyRate * 100);
  const gstCents = Math.round(subtotalCents * (draft.gstRate / 100));
  const qstCents = Math.round(subtotalCents * (draft.qstRate / 100));

  return {
    subtotalCents,
    gstCents,
    qstCents,
    totalCents: subtotalCents + gstCents + qstCents,
  };
}

export function InvoiceEditor({ draft: providedDraft, onSave, onDraftChange }: InvoiceEditorProps) {
  const [draft, setDraft] = React.useState<InvoiceDraft>(providedDraft ?? defaultDraft);
  const totals = React.useMemo(() => calculateInvoiceTotals(draft), [draft]);

  React.useEffect(() => {
    if (providedDraft) {
      setDraft(providedDraft);
    }
  }, [providedDraft]);

  React.useEffect(() => {
    onDraftChange?.(draft, totals);
  }, [draft, onDraftChange, totals]);

  function updateDraft<Field extends keyof InvoiceDraft>(field: Field, value: InvoiceDraft[Field]) {
    setDraft((currentDraft) => ({ ...currentDraft, [field]: value }));
  }

  return (
    <form
      className="panel stack"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(draft);
      }}
    >
      <div className="panel-heading">
        <div>
          <span className="section-kicker">Compose</span>
          <h2>Facture details</h2>
        </div>
        <Calculator size={20} aria-hidden="true" />
      </div>

      <div className="field-grid">
        <label>
          Invoice number
          <input
            value={draft.invoiceNumber}
            onChange={(event) => updateDraft('invoiceNumber', event.target.value)}
          />
        </label>
        <label>
          Document reference
          <input
            value={draft.documentReference}
            onChange={(event) => updateDraft('documentReference', event.target.value)}
          />
        </label>
        <label>
          Service date
          <input
            type="date"
            value={draft.serviceDate}
            onChange={(event) => updateDraft('serviceDate', event.target.value)}
          />
        </label>
        <label>
          Resource name
          <input
            value={draft.resourceName}
            onChange={(event) => updateDraft('resourceName', event.target.value)}
          />
        </label>
        <label>
          Language
          <select
            value={draft.language}
            onChange={(event) => updateDraft('language', event.target.value as InvoiceDraft['language'])}
          >
            <option value="fr-QC">Frances Quebec</option>
            <option value="en">English</option>
            <option value="pt-BR">Brazilian Portuguese</option>
          </select>
        </label>
        <label>
          Payment terms
          <input
            value={draft.paymentTerms}
            onChange={(event) => updateDraft('paymentTerms', event.target.value)}
          />
        </label>
        <label className="wide-field">
          Description
          <textarea
            rows={3}
            value={draft.description}
            onChange={(event) => updateDraft('description', event.target.value)}
          />
        </label>
        <label>
          Hours
          <input
            inputMode="decimal"
            type="number"
            step="0.25"
            min="0"
            value={draft.hours}
            onChange={(event) => updateDraft('hours', Number(event.target.value))}
          />
        </label>
        <label>
          Hourly rate
          <input
            inputMode="decimal"
            type="number"
            step="0.01"
            min="0"
            value={draft.hourlyRate}
            onChange={(event) => updateDraft('hourlyRate', Number(event.target.value))}
          />
        </label>
        <label>
          GST/TPS %
          <input
            inputMode="decimal"
            type="number"
            step="0.001"
            min="0"
            value={draft.gstRate}
            onChange={(event) => updateDraft('gstRate', Number(event.target.value))}
          />
        </label>
        <label>
          QST/TVQ %
          <input
            inputMode="decimal"
            type="number"
            step="0.001"
            min="0"
            value={draft.qstRate}
            onChange={(event) => updateDraft('qstRate', Number(event.target.value))}
          />
        </label>
      </div>

      <div className="totals-strip" aria-label="Invoice totals">
        <span>Subtotal {currencyFormatter.format(totals.subtotalCents / 100)}</span>
        <span>GST {currencyFormatter.format(totals.gstCents / 100)}</span>
        <span>QST {currencyFormatter.format(totals.qstCents / 100)}</span>
        <strong>{currencyFormatter.format(totals.totalCents / 100)}</strong>
      </div>

      <button className="primary-button" type="submit">
        <Save size={16} aria-hidden="true" />
        Save facture
      </button>
    </form>
  );
}
