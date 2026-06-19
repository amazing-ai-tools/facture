import React from 'react';
import { CheckCircle2, Download, FileArchive, FileText, Plus, Trash2 } from 'lucide-react';
import type { InvoiceSummary } from '../types';

interface InvoiceListProps {
  invoices: InvoiceSummary[];
  selectedInvoiceId: string;
  onSelectInvoice: (invoiceId: string) => void;
  onStartNewInvoice: () => void;
  onDeleteInvoice: (invoiceId: string) => void;
  onMarkPaid: (invoiceId: string, paidAt: string) => void;
  showDeleted: boolean;
  onToggleDeleted: (showDeleted: boolean) => void;
  reportUrl: string;
  batchExportUrl: string;
  showNewButton?: boolean;
}

const currencyFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
});

export function InvoiceList({
  invoices,
  selectedInvoiceId,
  onSelectInvoice,
  onStartNewInvoice,
  onDeleteInvoice,
  onMarkPaid,
  showDeleted,
  onToggleDeleted,
  reportUrl,
  batchExportUrl,
  showNewButton = true,
}: InvoiceListProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [paymentDates, setPaymentDates] = React.useState<Record<string, string>>({});

  function paymentDateFor(invoice: InvoiceSummary) {
    return paymentDates[invoice.id] ?? invoice.paidAt ?? today;
  }

  return (
    <section className="panel invoice-list" aria-labelledby="invoice-list-heading" aria-label="Facture history">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">Archive</span>
          <h2 id="invoice-list-heading">Facture history</h2>
        </div>
        <FileText size={20} aria-hidden="true" />
      </div>

      {showNewButton ? (
        <button className="primary-button full-width-button" type="button" onClick={onStartNewInvoice}>
          <Plus size={16} aria-hidden="true" />
          Create new facture
        </button>
      ) : null}

      <div className="history-export-actions" aria-label="Facture exports">
        <a className="secondary-button compact-button" href={reportUrl} download>
          <Download size={15} aria-hidden="true" />
          Rapport des factures emises
        </a>
        <a className="secondary-button compact-button" href={batchExportUrl} download>
          <FileArchive size={15} aria-hidden="true" />
          Exporter les PDFs envoyes
        </a>
      </div>

      <label className="inline-toggle">
        <input
          type="checkbox"
          checked={showDeleted}
          onChange={(event) => onToggleDeleted(event.target.checked)}
        />
        Show deleted factures
      </label>

      <div className="list-stack">
        {invoices.length === 0 ? (
          <p className="empty-state">No saved factures yet.</p>
        ) : (
          invoices.map((invoice) => (
            <div className={invoice.id === selectedInvoiceId ? 'invoice-row selected' : 'invoice-row'} key={invoice.id}>
              <button className="invoice-row-main" type="button" onClick={() => onSelectInvoice(invoice.id)}>
                <span>
                  <strong>{invoice.invoiceNumber}</strong>
                  <small>{invoice.clientName}</small>
                </span>
                <span>
                  <strong>{currencyFormatter.format(invoice.totalCents / 100)}</strong>
                  <small className={`status-tag ${invoice.deletedAt ? 'deleted' : invoice.status}`}>
                    {invoice.deletedAt ? 'deleted' : invoice.status}
                  </small>
                  {invoice.paidAt ? <small>Payee le {invoice.paidAt}</small> : null}
                </span>
              </button>
              <div className="invoice-row-actions">
                {!invoice.deletedAt && invoice.status === 'sent' && !invoice.paidAt ? (
                  <div className="payment-control">
                    <label>
                      Payee le
                      <input
                        type="date"
                        value={paymentDateFor(invoice)}
                        onChange={(event) =>
                          setPaymentDates((current) => ({ ...current, [invoice.id]: event.target.value }))
                        }
                      />
                    </label>
                    <button
                      className="secondary-button compact-button"
                      type="button"
                      onClick={() => onMarkPaid(invoice.id, paymentDateFor(invoice))}
                    >
                      <CheckCircle2 size={15} aria-hidden="true" />
                      Marquer payee
                    </button>
                  </div>
                ) : null}
                {!invoice.deletedAt ? (
                  <button
                    className="icon-danger-button"
                    type="button"
                    aria-label={`Delete ${invoice.invoiceNumber}`}
                    onClick={() => onDeleteInvoice(invoice.id)}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
