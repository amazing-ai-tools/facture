import React from 'react';
import ReactDOM from 'react-dom/client';
import { Building2, FileText, LogIn, Plus } from 'lucide-react';
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

interface BackendInvoice {
  id: string;
  companyId?: string;
  clientId?: string;
  invoiceNumber: string;
  language?: InvoiceDraft['language'];
  clientName?: string;
  documentReference: string;
  resourceName: string;
  paymentTerms?: string;
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
  const [companies, setCompanies] = React.useState<CompanyProfile[]>([]);
  const [company, setCompany] = React.useState(emptyCompany);
  const [selectedCompanyId, setSelectedCompanyId] = React.useState('');
  const [clients, setClients] = React.useState<ClientProfile[]>([]);
  const [client, setClient] = React.useState(emptyClient);
  const [selectedClientId, setSelectedClientId] = React.useState('');
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
        const loadedCompanies = companyResponse.companies;
        const loadedClients = clientResponse.clients;
        const initialCompany = loadedCompanies[0] ?? emptyCompany;
        const initialClient = loadedClients[0] ?? emptyClient;
        setCompanies(loadedCompanies);
        setCompany(initialCompany);
        setSelectedCompanyId(initialCompany.id ?? '');
        setClients(loadedClients);
        setClient(initialClient);
        setSelectedClientId(initialClient.id ?? '');
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

  function selectCompany(companyId: string) {
    setSelectedCompanyId(companyId);
    setCompany(companies.find((candidate) => candidate.id === companyId) ?? emptyCompany);
    setSelectedInvoiceId('');
    setNotice(companyId ? 'Company selected for the next invoice.' : 'New company form ready.');
  }

  function startNewCompany() {
    setSelectedCompanyId('');
    setCompany(emptyCompany);
    setSelectedInvoiceId('');
    setNotice('New company form ready. Save it before creating an invoice.');
  }

  function selectClient(clientId: string) {
    setSelectedClientId(clientId);
    setClient(clients.find((candidate) => candidate.id === clientId) ?? emptyClient);
    setSelectedInvoiceId('');
    setNotice(clientId ? 'Client selected for the next invoice.' : 'New client form ready.');
  }

  function startNewClient() {
    setSelectedClientId('');
    setClient(emptyClient);
    setSelectedInvoiceId('');
    setNotice('New client form ready. Save it before creating an invoice.');
  }

  function startNewInvoice() {
    setSelectedInvoiceId('');
    const nextDraft = createNextInvoiceDraft(invoices);
    setDraft(nextDraft);
    setTotals(calculateInvoiceTotals(nextDraft));
    setNotice('New facture ready. It will be saved under the active company and client.');
  }

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
          language: response.invoice.language ?? 'fr-QC',
          documentReference: response.invoice.documentReference,
          serviceDate: toDateInputValue(firstLine.serviceDate),
          resourceName: response.invoice.resourceName,
          paymentTerms: response.invoice.paymentTerms ?? 'MOIS-SUIV',
          description: firstLine.description,
          hours: firstLine.quantity,
          hourlyRate: firstLine.unitRateCents / 100,
          gstRate: 5,
          qstRate: 9.975,
        };
        setDraft(loadedDraft);
        setTotals(calculateInvoiceTotals(loadedDraft));
        if (response.invoice.companyId) {
          setSelectedCompanyId(response.invoice.companyId);
          setCompany(companies.find((candidate) => candidate.id === response.invoice.companyId) ?? company);
        }
        if (response.invoice.clientId) {
          setSelectedClientId(response.invoice.clientId);
          setClient(clients.find((candidate) => candidate.id === response.invoice.clientId) ?? client);
        }
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
  }, [client, clients, companies, company, selectedInvoiceId]);

  async function saveCompany(nextCompany: CompanyProfile) {
    try {
      const legalName = nextCompany.legalName.trim() || nextCompany.name?.trim() || '';
      if (!legalName) {
        setNotice('Enter at least a business or legal name before saving the company.');
        return;
      }

      const payload = {
        legalName,
        companyNumber: nextCompany.companyNumber,
        address: nextCompany.address,
        gstNumber: nextCompany.gstNumber,
        qstNumber: nextCompany.qstNumber,
        defaultHourlyRateCents: nextCompany.defaultHourlyRateCents,
      };
      const response = nextCompany.id
        ? await patchJson<{ company: CompanyProfile }, typeof payload>(`/companies/${nextCompany.id}`, payload)
        : await postJson<{ company: CompanyProfile }, typeof payload>('/companies', payload);
      const savedCompany = { ...nextCompany, ...response.company };
      setCompany(savedCompany);
      setSelectedCompanyId(savedCompany.id ?? '');
      setCompanies((currentCompanies) => {
        const withoutSaved = currentCompanies.filter((candidate) => candidate.id !== savedCompany.id);
        return [savedCompany, ...withoutSaved];
      });
      setNotice('Company profile saved.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save company.');
    }
  }

  async function saveClient(nextClient: ClientProfile) {
    try {
      const payload = {
        name: nextClient.name,
        billingAddress: nextClient.billingAddress,
        email: nextClient.email,
      };
      const response = nextClient.id
        ? await patchJson<{ client: ClientProfile }, typeof payload>(`/clients/${nextClient.id}`, payload)
        : await postJson<{ client: ClientProfile }, typeof payload>('/clients', payload);
      const savedClient = { ...nextClient, ...response.client };
      setClient(savedClient);
      setSelectedClientId(savedClient.id ?? '');
      setClients((currentClients) => {
        const withoutSaved = currentClients.filter((candidate) => candidate.id !== savedClient.id);
        return [savedClient, ...withoutSaved];
      });
      setNotice('Client saved.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save client.');
    }
  }

  async function saveInvoice(nextDraft: InvoiceDraft) {
    try {
      const activeCompany = companies.find((candidate) => candidate.id === selectedCompanyId) ?? company;
      if (!activeCompany.id || !client.id) {
        setNotice('Select or save a company and save a client before creating an invoice.');
        return;
      }

      const payload = {
        companyId: activeCompany.id,
        clientId: client.id,
        invoiceNumber: nextDraft.invoiceNumber,
        language: nextDraft.language,
        documentReference: nextDraft.documentReference,
        resourceName: nextDraft.resourceName,
        paymentTerms: nextDraft.paymentTerms,
        invoiceDate: toDateInputValue(nextDraft.serviceDate),
        lines: [
          {
            description: nextDraft.description,
            serviceDate: toDateInputValue(nextDraft.serviceDate),
            quantity: nextDraft.hours,
            unitRateCents: Math.round(nextDraft.hourlyRate * 100),
          },
        ],
      };
      type SaveInvoiceResponse = {
        invoice: {
          id: string;
          invoiceNumber: string;
          language?: InvoiceDraft['language'];
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
        invoiceDate: toDateInputValue(response.invoice.invoiceDate),
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
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save invoice.');
    }
  }

  async function handleSendInvoice() {
    try {
      if (!canUsePersistedInvoice) return;
      await sendInvoice(selectedInvoiceId);
      setInvoices((current) =>
        current.map((invoice) => (invoice.id === selectedInvoiceId ? { ...invoice, status: 'sent' } : invoice)),
      );
      setNotice('Invoice sent by email.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not send invoice.');
    }
  }

  function handleOpenPdf() {
    if (!canUsePersistedInvoice) {
      setNotice('Save the facture before opening the PDF.');
      return;
    }

    window.open(getInvoicePdfPreviewUrl(selectedInvoiceId), '_blank', 'noopener,noreferrer');
  }

  const summaryInvoice = selectedInvoice ?? {
    invoiceNumber: 'No invoice yet',
    clientName: client.name || 'No client yet',
    invoiceDate: draft.serviceDate,
    status: 'draft',
  };
  const activeCompany = companies.find((candidate) => candidate.id === selectedCompanyId) ?? company;
  const activeCompanyName = activeCompany.legalName || activeCompany.name || 'No company selected';
  const readyForFacture = Boolean(activeCompany.id && client.id);
  const issueBlockers = getInvoiceIssueBlockers(activeCompany, client, draft, totals);
  const canIssueInvoice = canUsePersistedInvoice && issueBlockers.length === 0;

  return (
    <div className="app-shell">
      <main className="workspace" id="dashboard">
        <header className="studio-hero">
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true">
              F
            </div>
            <div>
              <p>Private billing office</p>
              <span>{appName}</span>
            </div>
          </div>

          <div className="hero-copy">
            <span className="section-kicker">Quebec consulting invoices</span>
            <h1>Facture studio</h1>
            <p>
              Choose the company, confirm the client, compose the document, and send the invoice by email.
            </p>
          </div>

          <button className="primary-button" type="button" onClick={loginWithGoogle}>
            <LogIn size={16} aria-hidden="true" />
            {userEmail ? userEmail : 'Sign in with Google'}
          </button>
        </header>

        <section className="context-ribbon" aria-label="Active invoice context">
          <article>
            <span>Active company</span>
            <strong>{activeCompanyName}</strong>
          </article>
          <article>
            <span>Client</span>
            <strong>{summaryInvoice.clientName}</strong>
          </article>
          <article>
            <span>Facture</span>
            <strong>{summaryInvoice.invoiceNumber}</strong>
          </article>
          <article>
            <span>Readiness</span>
            <strong>{readyForFacture ? 'Ready to save' : 'Company and client needed'}</strong>
          </article>
        </section>

        <p className="notice-bar" role="status">{notice}</p>

        <section className="invoice-workbench" aria-label="Invoice workbench">
          <div className="setup-column">
            <section className="panel context-panel" aria-label="Companies">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">Step 1</span>
                  <h2>Choose company</h2>
                </div>
                <Building2 size={20} aria-hidden="true" />
              </div>

              <label>
                Select company
                <select
                  value={selectedCompanyId}
                  onChange={(event) => selectCompany(event.target.value)}
                  aria-label="Select company"
                >
                  <option value="">New company</option>
                  {companies.map((candidate) => (
                    <option key={candidate.id ?? candidate.legalName} value={candidate.id}>
                      {candidate.legalName || candidate.name || 'Untitled company'}
                    </option>
                  ))}
                </select>
              </label>

              <button className="secondary-button" type="button" onClick={startNewCompany}>
                <Plus size={16} aria-hidden="true" />
                Add company
              </button>
            </section>
            <CompanyForm company={company} onSave={(nextCompany) => void saveCompany(nextCompany)} />
            <ClientForm
              client={client}
              clients={clients}
              selectedClientId={selectedClientId}
              onSelectClient={selectClient}
              onStartNewClient={startNewClient}
              onSave={(nextClient) => void saveClient(nextClient)}
            />
          </div>

          <div className="compose-column" id="invoices">
            <InvoiceList
              invoices={invoices}
              selectedInvoiceId={selectedInvoiceId}
              onSelectInvoice={setSelectedInvoiceId}
              onStartNewInvoice={startNewInvoice}
            />
            <InvoiceEditor
              draft={draft}
              onSave={(nextDraft) => void saveInvoice(nextDraft)}
              onDraftChange={handleDraftChange}
            />
          </div>

          <div className="preview-column">
            <InvoicePreview
              draft={draft}
              totals={totals}
              company={activeCompany}
              client={client}
              canSend={canIssueInvoice}
              issueBlockers={canUsePersistedInvoice ? issueBlockers : []}
              pdfUrl={canIssueInvoice ? getInvoicePdfPreviewUrl(selectedInvoiceId) : undefined}
              onOpenPdf={handleOpenPdf}
              onSend={() => void handleSendInvoice()}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

function mapInvoiceSummary(invoice: BackendInvoice): InvoiceSummary {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    clientName: invoice.clientName ?? 'Client',
    invoiceDate: toDateInputValue(invoice.invoiceDate),
    totalCents: invoice.totalCents,
    status: invoice.status,
  };
}

function createNextInvoiceDraft(invoices: InvoiceSummary[]): InvoiceDraft {
  const currentYear = initialDraft.serviceDate.slice(0, 4);
  const maxSequence = invoices.reduce((max, invoice) => {
    const match = invoice.invoiceNumber.match(new RegExp(`^FAC-${currentYear}-(\\d+)$`));
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  const nextSequence = String(maxSequence + 1).padStart(3, '0');

  return {
    ...initialDraft,
    invoiceNumber: `FAC-${currentYear}-${nextSequence}`,
  };
}

function toDateInputValue(value: string) {
  return value.slice(0, 10);
}

function getInvoiceIssueBlockers(
  company: CompanyProfile,
  client: ClientProfile,
  draft: InvoiceDraft,
  totals: InvoiceTotals,
) {
  const blockers: string[] = [];
  if (!(company.legalName || company.name)?.trim()) blockers.push('supplier name');
  if (!company.gstNumber.trim()) blockers.push('GST/TPS number');
  if (!company.qstNumber.trim()) blockers.push('QST/TVQ number');
  if (!client.name.trim()) blockers.push('client name');
  if (!draft.paymentTerms.trim()) blockers.push('payment terms');
  if (!draft.description.trim()) blockers.push('service description');
  if (totals.totalCents <= 0) blockers.push('total payable');
  return blockers;
}

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<App />);
}
