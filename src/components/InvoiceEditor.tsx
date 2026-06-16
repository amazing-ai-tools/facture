import { Calculator, Plus, Save, Trash2 } from 'lucide-react';
import React from 'react';
import type { InvoiceDraft, InvoiceTotals } from '../types';

interface InvoiceEditorProps {
  draft?: InvoiceDraft;
  onSave: (draft: InvoiceDraft) => void;
  onDraftChange?: (draft: InvoiceDraft, totals: InvoiceTotals) => void;
}

const defaultDraft: InvoiceDraft = {
  invoiceNumber: '2026-001',
  invoiceDate: '2026-06-10',
  paymentTerms: '30 jours',
  lines: [{ description: "Main d'oeuvre", quantity: 40.5, unitPrice: 94 }],
  gstRate: 5,
  qstRate: 9.975,
};

const currencyFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
});

export function calculateInvoiceTotals(draft: InvoiceDraft): InvoiceTotals {
  const subtotalCents = draft.lines.reduce(
    (total, line) => total + Math.round(line.quantity * line.unitPrice * 100),
    0,
  );
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

  function updateLine(index: number, field: keyof InvoiceDraft['lines'][number], value: string | number) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      lines: currentDraft.lines.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...line,
              [field]: field === 'description' ? String(value) : Number(value),
            }
          : line,
      ),
    }));
  }

  function addLine() {
    setDraft((currentDraft) => ({
      ...currentDraft,
      lines: [...currentDraft.lines, { description: '', quantity: 0, unitPrice: 0 }],
    }));
  }

  function removeLine(index: number) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      lines:
        currentDraft.lines.length === 1
          ? [{ description: '', quantity: 0, unitPrice: 0 }]
          : currentDraft.lines.filter((_, lineIndex) => lineIndex !== index),
    }));
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
          Facture no
          <input
            value={draft.invoiceNumber}
            onChange={(event) => updateDraft('invoiceNumber', event.target.value)}
          />
        </label>
        <label>
          Date
          <input
            type="date"
            value={draft.invoiceDate}
            onChange={(event) => updateDraft('invoiceDate', event.target.value)}
          />
        </label>
        <label>
          Echeance
          <input
            value={draft.paymentTerms}
            onChange={(event) => updateDraft('paymentTerms', event.target.value)}
          />
        </label>
        <label>
          TPS %
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
          TVQ %
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

      <div className="invoice-lines-editor" role="group" aria-label="Facture line items">
        <div className="invoice-lines-header" aria-hidden="true">
          <span>Description</span>
          <span>Quantite</span>
          <span>Prix unit. ($)</span>
          <span>Montant ($)</span>
        </div>
        {draft.lines.map((line, index) => {
          const rowNumber = index + 1;
          return (
            <div className="invoice-line-row" key={rowNumber}>
              <label>
                <span className="visually-hidden">Description {rowNumber}</span>
                <input
                  aria-label={`Description ${rowNumber}`}
                  value={line.description}
                  onChange={(event) => updateLine(index, 'description', event.target.value)}
                />
              </label>
              <label>
                <span className="visually-hidden">Quantite {rowNumber}</span>
                <input
                  aria-label={`Quantite ${rowNumber}`}
                  inputMode="decimal"
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.quantity}
                  onChange={(event) => updateLine(index, 'quantity', event.target.value)}
                />
              </label>
              <label>
                <span className="visually-hidden">Prix unit. ($) {rowNumber}</span>
                <input
                  aria-label={`Prix unit. ($) ${rowNumber}`}
                  inputMode="decimal"
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.unitPrice}
                  onChange={(event) => updateLine(index, 'unitPrice', event.target.value)}
                />
              </label>
              <output>{currencyFormatter.format(line.quantity * line.unitPrice)}</output>
              <button
                aria-label={`Remove line ${rowNumber}`}
                className="icon-danger-button"
                disabled={draft.lines.length === 1}
                onClick={() => removeLine(index)}
                type="button"
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </div>
          );
        })}
        <button className="secondary-button add-line-button" onClick={addLine} type="button">
          <Plus size={16} aria-hidden="true" />
          Add line
        </button>
      </div>

      <div className="totals-strip" aria-label="Invoice totals">
        <span>Subtotal {currencyFormatter.format(totals.subtotalCents / 100)}</span>
        <span>TPS {currencyFormatter.format(totals.gstCents / 100)}</span>
        <span>TVQ {currencyFormatter.format(totals.qstCents / 100)}</span>
        <strong>{currencyFormatter.format(totals.totalCents / 100)}</strong>
      </div>

      <button className="primary-button" type="submit">
        <Save size={16} aria-hidden="true" />
        Save facture
      </button>
    </form>
  );
}
