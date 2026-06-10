import { Mail, Send } from 'lucide-react';
import type { ClientProfile, CompanyProfile, InvoiceDraft, InvoiceTotals } from '../types';
import type { uiCopy } from '../i18n';

interface InvoicePreviewProps {
  draft: InvoiceDraft;
  totals: InvoiceTotals;
  company: CompanyProfile;
  client: ClientProfile;
  copy: (typeof uiCopy)['fr-QC'];
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

export function InvoicePreview({
  draft,
  totals,
  company,
  client,
  copy,
  onOpenPdf,
  onSend,
  canSend,
  issueBlockers = [],
  pdfUrl,
}: InvoicePreviewProps) {
  return (
    <section className="panel preview-panel" aria-labelledby="preview-heading">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">Document</span>
          <h2 id="preview-heading">{copy.previewTitle}</h2>
        </div>
        <Mail size={20} aria-hidden="true" />
      </div>

      <div className="pdf-preview" aria-label="Invoice PDF preview placeholder">
        <header className="preview-document-header">
          <div>
            <span className="document-label">{copy.documentLabel}</span>
            <h3>{draft.invoiceNumber}</h3>
          </div>
          <p>{draft.invoiceDate}</p>
        </header>

        <div className="preview-parties">
          <section>
            <span>{copy.supplier}</span>
            <strong>{company.legalName || company.name || copy.noCompany}</strong>
            <p>{company.address || copy.noAddress}</p>
            <p>{company.email ? `Courriel : ${company.email}` : null}</p>
            <p>No TPS : {company.gstNumber || copy.missing}</p>
            <p>No TVQ : {company.qstNumber || copy.missing}</p>
            <p>NEQ : {company.companyNumber || copy.missing}</p>
          </section>
          <section>
            <span>FACTURER A</span>
            <strong>{client.name || copy.noClient}</strong>
            <p>{client.billingAddress || copy.noBillingAddress}</p>
          </section>
        </div>

        <div className="preview-facture-meta">
          <span>Facture no : {draft.invoiceNumber}</span>
          <span>Date : {draft.invoiceDate}</span>
          <span>Echeance : {draft.paymentTerms || copy.specifyTerms}</span>
        </div>

        <div className="preview-lines-table" role="table" aria-label="Facture preview lines">
          <div className="preview-lines-header" role="row">
            <span>Description</span>
            <span>Quantite</span>
            <span>Prix unit. ($)</span>
            <span>Montant ($)</span>
          </div>
          {draft.lines
            .filter((line) => line.description.trim() || line.quantity > 0 || line.unitPrice > 0)
            .map((line, index) => (
              <div className="preview-lines-row" role="row" key={`${line.description}-${index}`}>
                <span>{line.description || '-'}</span>
                <span>{line.quantity.toFixed(2)}</span>
                <span>{currencyFormatter.format(line.unitPrice)}</span>
                <span>{currencyFormatter.format(line.quantity * line.unitPrice)}</span>
              </div>
            ))}
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

        <div className="preview-payment-terms">
          <strong>MODALITES DE PAIEMENT</strong>
          <p>
            Paiement du sous {draft.paymentTerms || '30 jours'}.
            {company.email ? ` Virement Interac a ${company.email}.` : ''}
          </p>
        </div>
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
            ? `${copy.completeBeforeSend}: ${issueBlockers.join(', ')}.`
            : copy.saveFirst}
        </p>
      ) : null}
    </section>
  );
}
