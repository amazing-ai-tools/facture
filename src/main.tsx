import React from 'react';
import ReactDOM from 'react-dom/client';
import { FileText, LayoutDashboard, LogIn, Settings, Users } from 'lucide-react';
import {
  type CurrentUserResponse,
  fetchJson,
  getInvoicePdfPreviewUrl,
  loginWithGoogle,
  patchJson,
  postJson,
  sendInvoice,
} from './api';
import { ClientForm } from './components/ClientForm';
import { CompanyForm } from './components/CompanyForm';
import { calculateInvoiceTotals, InvoiceEditor } from './components/InvoiceEditor';
import { InvoiceList } from './components/InvoiceList';
import { InvoicePreview } from './components/InvoicePreview';
import type { ClientProfile, CompanyProfile, InvoiceDraft, InvoiceSummary, InvoiceTotals } from './types';
import './styles.css';

const appName = import.meta.env.VITE_APP_NAME || 'Facture';
const bugzeroAppKey = import.meta.env.VITE_BUGZERO_APP_KEY || '';
const bugzeroWidgetUrl =
  import.meta.env.VITE_BUGZERO_WIDGET_URL || 'https://bugzero.amazing-ai.tools/widget.js';

const emptyCompany: CompanyProfile = {
  name: '',
  legalName: '',
  companyNumber: '',
  gstNumber: '',
  qstNumber: '',
  defaultHourlyRateCents: 9400,
  paymentTerms: 'MOIS-SUIV',
  address: '',
};

const emptyClient: ClientProfile = {
  name: '',
  contactName: '',
  email: '',
  billingAddress: '',
};

const initialDraft: InvoiceDraft = {
  invoiceNumber: 'FAC-2026-001',
  documentReference: 'May consulting services',
  serviceDate: '2026-05-29',
  resourceName: 'Senior consultant',
  description: 'Product engineering and delivery support',
  hours: 40.5,
  hourlyRate: 94,
  gstRate: 5,
  qstRate: 9.975,
};

interface BackendInvoice {
  id: string;
  invoiceNumber: string;
  clientName?: string;
  documentReference: string;
  resourceName: string;
  invoiceDate: string;
  status: InvoiceSummary['status'];
  totalCents: number;
  lines?: Array<{
    description: string;
    serviceDate: string;
    quantity: number;
    unitRateCents: number;
  }>;
}

function ensureBugZeroWidget() {
  if (!bugzeroAppKey || document.querySelector('script[data-bugzero-widget]')) {
    return;
  }

  const script = document.createElement('script');
  script.src = bugzeroWidgetUrl;
  script.async = true;
  script.dataset.bugzeroWidget = 'true';
  script.dataset.appKey = bugzeroAppKey;
  document.body.appendChild(script);
}

export function App() {
  const [company, setCompany] = React.useState(emptyCompany);
  const [client, setClient] = React.useState(emptyClient);
  const [invoices, setInvoices] = React.useState<InvoiceSummary[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState('');
  const [draft, setDraft] = React.useState<InvoiceDraft>(initialDraft);
  const [totals, setTotals] = React.useState<InvoiceTotals>(() => calculateInvoiceTotals(initialDraft));
  const [notice, setNotice] = React.useState('Sign in with Google to load your company, clients, and invoices.');
  const [userEmail, setUserEmail] = React.useState('');

  React.useEffect(() => {
    ensureBugZeroWidget();
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    async function loadWorkspace() {
      try {
        const me = await fetchJson<CurrentUserResponse>('/me');
        const [companyResponse, clientResponse, invoiceResponse] = await Promise.all([
          fetchJson<{ companies: CompanyProfile[] }>('/companies'),
          fetchJson<{ clients: ClientProfile[] }>('/clients'),
          fetchJson<{ invoices: BackendInvoice[] }>('/invoices'),
        ]);

        if (!isMounted) return;

        setUserEmail(me.user.email);
        setCompany(companyResponse.companies[0] ?? emptyCompany);
        setClient(clientResponse.clients[0] ?? emptyClient);
        const loadedInvoices = invoiceResponse.invoices.map(mapInvoiceSummary);
        setInvoices(loadedInvoices);
        setSelectedInvoiceId(loadedInvoices[0]?.id ?? '');
        setNotice(
          loadedInvoices.length > 0
            ? 'Workspace loaded from the Facture API.'
            : 'Workspace loaded. Save company and client data, then create your first invoice.',
        );
      } catch (error) {
        if (!isMounted) return;
        setNotice('Sign in with Google to load your saved workspace.');
      }
    }

    void loadWorkspace();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDraftChange = React.useCallback((updatedDraft: InvoiceDraft, updatedTotals: InvoiceTotals) => {
    setDraft(updatedDraft);
    setTotals(updatedTotals);
  }, []);

  const selectedInvoice = invoices.find((invoice) => invoice.id === selectedInvoiceId);
  const canUsePersistedInvoice = Boolean(selectedInvoice?.id);

  React.useEffect(() => {
    if (!selectedInvoiceId) return;

    let isMounted = true;

    async function loadInvoiceDetails() {
      try {
        const response = await fetchJson<{ invoice: BackendInvoice }>(`/invoices/${selectedInvoiceId}`);
        if (!isMounted || !response.invoice.lines?.[0]) return;

        const firstLine = response.invoice.lines[0];
        const loadedDraft: InvoiceDraft = {
          invoiceNumber: response.invoice.invoiceNumber,
          documentReference: response.invoice.documentReference,
          serviceDate: firstLine.serviceDate,
          resourceName: response.invoice.resourceName,
          description: firstLine.description,
          hours: firstLine.quantity,
          hourlyRate: firstLine.unitRateCents / 100,
          gstRate: 5,
          qstRate: 9.975,
        };
        setDraft(loadedDraft);
        setTotals(calculateInvoiceTotals(loadedDraft));
      } catch (error) {
        if (isMounted) {
          setNotice('Could not load invoice details. Try signing in again.');
        }
      }
    }

    void loadInvoiceDetails();

    return () => {
      isMounted = false;
    };
  }, [selectedInvoiceId]);

  async function saveCompany(nextCompany: CompanyProfile) {
    const payload = {
      legalName: nextCompany.legalName,
      companyNumber: nextCompany.companyNumber,
      address: nextCompany.address,
      gstNumber: nextCompany.gstNumber,
      qstNumber: nextCompany.qstNumber,
      defaultHourlyRateCents: nextCompany.defaultHourlyRateCents,
      paymentTerms: nextCompany.paymentTerms,
    };
    const response = nextCompany.id
      ? await patchJson<{ company: CompanyProfile }, typeof payload>(`/companies/${nextCompany.id}`, payload)
      : await postJson<{ company: CompanyProfile }, typeof payload>('/companies', payload);
    setCompany({ ...nextCompany, ...response.company });
    setNotice('Company profile saved.');
  }

  async function saveClient(nextClient: ClientProfile) {
    const payload = {
      name: nextClient.name,
      billingAddress: nextClient.billingAddress,
      email: nextClient.email,
    };
    const response = nextClient.id
      ? await patchJson<{ client: ClientProfile }, typeof payload>(`/clients/${nextClient.id}`, payload)
      : await postJson<{ client: ClientProfile }, typeof payload>('/clients', payload);
    setClient({ ...nextClient, ...response.client });
    setNotice('Client saved.');
  }

  async function saveInvoice(nextDraft: InvoiceDraft) {
    if (!company.id || !client.id) {
      setNotice('Save the company and client before creating an invoice.');
      return;
    }

    const payload = {
      companyId: company.id,
      clientId: client.id,
      invoiceNumber: nextDraft.invoiceNumber,
      documentReference: nextDraft.documentReference,
      resourceName: nextDraft.resourceName,
      invoiceDate: nextDraft.serviceDate,
      lines: [
        {
          description: nextDraft.description,
          serviceDate: nextDraft.serviceDate,
          quantity: nextDraft.hours,
          unitRateCents: Math.round(nextDraft.hourlyRate * 100),
        },
      ],
    };
    type SaveInvoiceResponse = {
      invoice: {
        id: string;
        invoiceNumber: string;
        invoiceDate: string;
        status: InvoiceSummary['status'];
        totalCents: number;
      };
    };
    const response = canUsePersistedInvoice
      ? await patchJson<SaveInvoiceResponse, typeof payload>(`/invoices/${selectedInvoiceId}`, payload)
      : await postJson<SaveInvoiceResponse, typeof payload>('/invoices', payload);

    const savedInvoice: InvoiceSummary = {
      id: response.invoice.id,
      invoiceNumber: response.invoice.invoiceNumber,
      clientName: client.name,
      invoiceDate: response.invoice.invoiceDate,
      totalCents: response.invoice.totalCents,
      status: response.invoice.status,
    };
    setDraft(nextDraft);
    setInvoices((current) => {
      const withoutSaved = current.filter((invoice) => invoice.id !== savedInvoice.id);
      return [savedInvoice, ...withoutSaved];
    });
    setSelectedInvoiceId(savedInvoice.id);
    setNotice('Invoice saved. PDF preview and email send are now available.');
  }

  async function handleSendInvoice() {
    if (!canUsePersistedInvoice) return;
    await sendInvoice(selectedInvoiceId);
    setInvoices((current) =>
      current.map((invoice) => (invoice.id === selectedInvoiceId ? { ...invoice, status: 'sent' } : invoice)),
    );
    setNotice('Invoice sent by email.');
  }

  const summaryInvoice = selectedInvoice ?? {
    invoiceNumber: 'No invoice yet',
    clientName: client.name || 'No client yet',
    invoiceDate: draft.serviceDate,
    status: 'draft',
  };

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            F
          </div>
          <div>
            <p>Private billing</p>
            <h1>{appName}</h1>
          </div>
        </div>

        <nav>
          <a href="#dashboard" className="active">
            <LayoutDashboard size={17} aria-hidden="true" />
            Dashboard
          </a>
          <a href="#invoices">
            <FileText size={17} aria-hidden="true" />
            Invoices
          </a>
          <a href="#clients">
            <Users size={17} aria-hidden="true" />
            Clients
          </a>
          <a href="#settings">
            <Settings size={17} aria-hidden="true" />
            Settings
          </a>
        </nav>
      </aside>

      <main className="workspace" id="dashboard">
        <header className="topbar">
          <div>
            <span className="section-kicker">Google authenticated workspace</span>
            <h2>Invoice operations</h2>
            <p className="topbar-note">{notice}</p>
          </div>
          <button className="primary-button" type="button" onClick={loginWithGoogle}>
            <LogIn size={16} aria-hidden="true" />
            {userEmail ? userEmail : 'Sign in with Google'}
          </button>
        </header>

        <section className="summary-grid" aria-label="Invoice summary">
          <article>
            <span>Current invoice</span>
            <strong>{summaryInvoice.invoiceNumber}</strong>
          </article>
          <article>
            <span>Client</span>
            <strong>{summaryInvoice.clientName}</strong>
          </article>
          <article>
            <span>Issued</span>
            <strong>{summaryInvoice.invoiceDate}</strong>
          </article>
          <article>
            <span>Status</span>
            <strong>{summaryInvoice.status}</strong>
          </article>
        </section>

        <div className="dashboard-grid">
          <div className="left-column">
            <CompanyForm company={company} onSave={(nextCompany) => void saveCompany(nextCompany)} />
            <ClientForm client={client} onSave={(nextClient) => void saveClient(nextClient)} />
          </div>

          <div className="center-column" id="invoices">
            <InvoiceList
              invoices={invoices}
              selectedInvoiceId={selectedInvoiceId}
              onSelectInvoice={setSelectedInvoiceId}
            />
            <InvoiceEditor
              draft={draft}
              onSave={(nextDraft) => void saveInvoice(nextDraft)}
              onDraftChange={handleDraftChange}
            />
          </div>

          <InvoicePreview
            draft={draft}
            totals={totals}
            previewUrl={canUsePersistedInvoice ? getInvoicePdfPreviewUrl(selectedInvoiceId) : '#'}
            canSend={canUsePersistedInvoice}
            onSend={() => void handleSendInvoice()}
          />
        </div>
      </main>
    </div>
  );
}

function mapInvoiceSummary(invoice: BackendInvoice): InvoiceSummary {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    clientName: invoice.clientName ?? 'Client',
    invoiceDate: invoice.invoiceDate,
    totalCents: invoice.totalCents,
    status: invoice.status,
  };
}

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<App />);
}
