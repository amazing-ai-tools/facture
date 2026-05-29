import { Mail, Send } from 'lucide-react';
import type { ClientProfile, CompanyProfile, InvoiceDraft, InvoiceTotals } from '../types';

interface InvoicePreviewProps {
  draft: InvoiceDraft;
  totals: InvoiceTotals;
  company: CompanyProfile;
  client: ClientProfile;
  onOpenPdf: () => void;
  onSend: () => void;
  canSend: boolean;
  pdfUrl?: string;
}

const currencyFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
});

export function InvoicePreview({ draft, totals, company, client, onOpenPdf, onSend, canSend, pdfUrl }: InvoicePreviewProps) {
  return (
    <section className="panel preview-panel" aria-labelledby="preview-heading">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">Document</span>
          <h2 id="preview-heading">Facture preview</h2>
        </div>
        <Mail size={20} aria-hidden="true" />
      </div>

      <div className="pdf-preview" aria-label="Invoice PDF preview placeholder">
        <header className="preview-document-header">
          <div>
            <span className="document-label">Facture</span>
            <h3>{draft.invoiceNumber}</h3>
          </div>
          <p>{draft.serviceDate}</p>
        </header>

        <div className="preview-parties">
          <section>
            <span>Fournisseur</span>
            <strong>{company.legalName || company.name || 'Select a company'}</strong>
            <p>{company.address || 'Company address'}</p>
          </section>
          <section>
            <span>Client</span>
            <strong>{client.name || 'Select a client'}</strong>
            <p>{client.billingAddress || 'Client billing address'}</p>
          </section>
        </div>

        <div className="preview-line">
          <span>{draft.documentReference}</span>
          <strong>{draft.resourceName}</strong>
          <p>{draft.description}</p>
          <div>
            <span>{draft.hours} h</span>
            <span>{currencyFormatter.format(draft.hourlyRate)} / h</span>
          </div>
          <p className="preview-terms">Terms: {draft.paymentTerms || 'Specify payment terms'}</p>
        </div>

        <dl className="preview-totals">
          <div>
            <dt>Subtotal</dt>
            <dd>{currencyFormatter.format(totals.subtotalCents / 100)}</dd>
          </div>
          <div>
            <dt>GST</dt>
            <dd>{currencyFormatter.format(totals.gstCents / 100)}</dd>
          </div>
          <div>
            <dt>QST</dt>
            <dd>{currencyFormatter.format(totals.qstCents / 100)}</dd>
          </div>
          <div className="total-line">
            <dt>Total</dt>
            <dd>{currencyFormatter.format(totals.totalCents / 100)}</dd>
          </div>
        </dl>
      </div>

      <div className="button-row">
        {canSend && pdfUrl ? (
          <a className="secondary-button" href={pdfUrl} target="_blank" rel="noreferrer">
            Open PDF
          </a>
        ) : (
          <button className="secondary-button" type="button" onClick={onOpenPdf} disabled>
            Open PDF
          </button>
        )}
        <button className="primary-button" type="button" onClick={onSend} disabled={!canSend}>
          <Send size={16} aria-hidden="true" />
          Send by email
        </button>
      </div>
      {!canSend ? <p className="action-hint">Save the facture before opening the PDF or sending it.</p> : null}
    </section>
  );
}
