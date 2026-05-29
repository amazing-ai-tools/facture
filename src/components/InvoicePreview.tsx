import { Mail, Send } from 'lucide-react';
import type { InvoiceDraft, InvoiceTotals } from '../types';

interface InvoicePreviewProps {
  draft: InvoiceDraft;
  totals: InvoiceTotals;
  previewUrl: string;
  onSend: () => void;
  canSend: boolean;
}

const currencyFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
});

export function InvoicePreview({ draft, totals, previewUrl, onSend, canSend }: InvoicePreviewProps) {
  return (
    <section className="panel preview-panel" aria-labelledby="preview-heading">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">Preview</span>
          <h2 id="preview-heading">PDF and send</h2>
        </div>
        <Mail size={20} aria-hidden="true" />
      </div>

      <div className="pdf-preview" aria-label="Invoice PDF preview placeholder">
        <div>
          <span className="document-label">{draft.invoiceNumber}</span>
          <h3>{draft.documentReference}</h3>
          <p>{draft.description}</p>
        </div>
        <dl>
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
        <a className="secondary-button" href={previewUrl} aria-disabled={!canSend}>
          Open PDF preview
        </a>
        <button className="primary-button" type="button" onClick={onSend} disabled={!canSend}>
          <Send size={16} aria-hidden="true" />
          Send by email
        </button>
      </div>
    </section>
  );
}
