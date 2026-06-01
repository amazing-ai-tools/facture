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
  issueBlockers?: string[];
  pdfUrl?: string;
}

const currencyFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
});

const previewCopy = {
  'fr-QC': {
    title: 'Facture preview',
    documentLabel: 'Facture',
    supplier: 'Fournisseur',
    client: 'Client',
    terms: 'Modalites',
    specifyTerms: 'Specifier les modalites',
    subtotal: 'Sous-total',
    total: 'Total a payer',
    openPdf: 'Open PDF',
    send: 'Send by email',
  },
  en: {
    title: 'Invoice preview',
    documentLabel: 'Invoice',
    supplier: 'Supplier',
    client: 'Client',
    terms: 'Terms',
    specifyTerms: 'Specify payment terms',
    subtotal: 'Subtotal',
    total: 'Total to pay',
    openPdf: 'Open PDF',
    send: 'Send by email',
  },
  'pt-BR': {
    title: 'Previa da fatura',
    documentLabel: 'Fatura',
    supplier: 'Fornecedor',
    client: 'Cliente',
    terms: 'Condicoes',
    specifyTerms: 'Informe as condicoes',
    subtotal: 'Subtotal',
    total: 'Total a pagar',
    openPdf: 'Open PDF',
    send: 'Send by email',
  },
};

export function InvoicePreview({
  draft,
  totals,
  company,
  client,
  onOpenPdf,
  onSend,
  canSend,
  issueBlockers = [],
  pdfUrl,
}: InvoicePreviewProps) {
  const copy = previewCopy[draft.language] ?? previewCopy['fr-QC'];

  return (
    <section className="panel preview-panel" aria-labelledby="preview-heading">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">Document</span>
          <h2 id="preview-heading">{copy.title}</h2>
        </div>
        <Mail size={20} aria-hidden="true" />
      </div>

      <div className="pdf-preview" aria-label="Invoice PDF preview placeholder">
        <header className="preview-document-header">
          <div>
            <span className="document-label">{copy.documentLabel}</span>
            <h3>{draft.invoiceNumber}</h3>
          </div>
          <p>{draft.serviceDate}</p>
        </header>

        <div className="preview-parties">
          <section>
            <span>{copy.supplier}</span>
            <strong>{company.legalName || company.name || 'Select a company'}</strong>
            <p>{company.address || 'Company address'}</p>
          </section>
          <section>
            <span>{copy.client}</span>
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
          <p className="preview-terms">{copy.terms}: {draft.paymentTerms || copy.specifyTerms}</p>
        </div>

        <dl className="preview-totals">
          <div>
            <dt>{copy.subtotal}</dt>
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
            <dt>{copy.total}</dt>
            <dd>{currencyFormatter.format(totals.totalCents / 100)}</dd>
          </div>
        </dl>
      </div>

      <div className="button-row">
        {canSend && pdfUrl ? (
          <a className="secondary-button" href={pdfUrl} target="_blank" rel="noreferrer">
            {copy.openPdf}
          </a>
        ) : (
          <button className="secondary-button" type="button" onClick={onOpenPdf} disabled>
            {copy.openPdf}
          </button>
        )}
        <button className="primary-button" type="button" onClick={onSend} disabled={!canSend}>
          <Send size={16} aria-hidden="true" />
          {copy.send}
        </button>
      </div>
      {!canSend ? (
        <p className="action-hint">
          {issueBlockers.length > 0
            ? `Complete before PDF/send: ${issueBlockers.join(', ')}.`
            : 'Save the facture before opening the PDF or sending it.'}
        </p>
      ) : null}
    </section>
  );
}
