import React from 'react';
import ReactDOM from 'react-dom/client';
import { Building2, CheckCircle2, FileText, LogIn, Pencil, Plus, UserRoundPlus } from 'lucide-react';
import {
  type CurrentUserResponse,
  deleteJson,
  fetchJson,
  getIssuedInvoiceReportUrl,
  getInvoicePdfPreviewUrl,
  getSentInvoiceBatchExportUrl,
  loginWithGoogle,
  markInvoicePaid,
  patchJson,
  postJson,
  sendInvoice,
} from './api';
import { ClientForm } from './components/ClientForm';
import { CompanyForm } from './components/CompanyForm';
import { calculateInvoiceTotals, InvoiceEditor } from './components/InvoiceEditor';
import { InvoiceList } from './components/InvoiceList';
import { InvoicePreview } from './components/InvoicePreview';
import { interfaceLanguages, uiCopy } from './i18n';
import type { ClientProfile, CompanyProfile, InterfaceLanguage, InvoiceDraft, InvoiceSummary, InvoiceTotals } from './types';
import './styles.css';

const appName = import.meta.env.VITE_APP_NAME || 'Facture';
const bugzeroAppKey = import.meta.env.VITE_BUGZERO_APP_KEY || '';
const bugzeroWidgetUrl =
  import.meta.env.VITE_BUGZERO_WIDGET_URL || 'https://bugzero.amazing-ai.tools/widget.js';

const emptyCompany: CompanyProfile = {
  name: '',
  legalName: '',
  companyNumber: '',
  email: '',
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
  invoiceNumber: '2026-001',
  invoiceDate: '2026-06-10',
  paymentTerms: '30 jours',
  lines: normalizeDraftLines([
    { description: "Main d'oeuvre", quantity: 40.5, unitPrice: 94 },
  ]),
  gstRate: 5,
  qstRate: 9.975,
};

interface BackendInvoice {
  id: string;
  companyId?: string;
  clientId?: string;
  invoiceNumber: string;
  clientName?: string;
  documentReference: string;
  resourceName: string;
  paymentTerms?: string;
  invoiceDate: string;
  status: InvoiceSummary['status'];
  totalCents: number;
  paidAt?: string | null;
  deletedAt?: string | null;
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
  const [showDeletedInvoices, setShowDeletedInvoices] = React.useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState('');
  const [invoiceDetailsReloadKey, setInvoiceDetailsReloadKey] = React.useState(0);
  const [draft, setDraft] = React.useState<InvoiceDraft>(initialDraft);
  const [totals, setTotals] = React.useState<InvoiceTotals>(() => calculateInvoiceTotals(initialDraft));
  const [isEditingCompany, setIsEditingCompany] = React.useState(false);
  const [isEditingClient, setIsEditingClient] = React.useState(false);
  const [notice, setNotice] = React.useState('Sign in with Google to load your company, clients, and invoices.');
  const [isToastVisible, setIsToastVisible] = React.useState(false);
  const [sentConfirmationInvoiceId, setSentConfirmationInvoiceId] = React.useState('');
  const [userEmail, setUserEmail] = React.useState('');
  const [interfaceLanguage, setInterfaceLanguage] = React.useState<InterfaceLanguage>('fr-QC');
  const copy = uiCopy[interfaceLanguage];

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
        setIsEditingCompany(false);
        setClients(loadedClients);
        setClient(initialClient);
        setSelectedClientId(initialClient.id ?? '');
        setIsEditingClient(!initialClient.id);
        const loadedInvoices = invoiceResponse.invoices.map(mapInvoiceSummary);
        setInvoices(loadedInvoices);
        setSelectedInvoiceId(loadedInvoices[0]?.id ?? '');
        setNotice('');
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
    setIsEditingCompany(false);
    setSelectedInvoiceId('');
    setNotice(companyId ? 'Company selected for the next invoice.' : 'Choose a company or click Add company to create one.');
  }

  function startNewCompany() {
    setSelectedCompanyId('');
    setCompany(emptyCompany);
    setIsEditingCompany(true);
    setSelectedInvoiceId('');
    setNotice('New company form ready. Save it before creating an invoice.');
  }

  function selectClient(clientId: string) {
    setSelectedClientId(clientId);
    setClient(clients.find((candidate) => candidate.id === clientId) ?? emptyClient);
    setIsEditingClient(!clientId);
    setSelectedInvoiceId('');
    setNotice(clientId ? 'Client selected for the next invoice.' : 'New client form ready.');
  }

  function startNewClient() {
    setSelectedClientId('');
    setClient(emptyClient);
    setIsEditingClient(true);
    setSelectedInvoiceId('');
    setNotice('New client form ready. Save it before creating an invoice.');
  }

  function startNewInvoice() {
    setSentConfirmationInvoiceId('');
    setSelectedInvoiceId('');
    const nextDraft = createNextInvoiceDraft(invoices);
    setDraft(nextDraft);
    setTotals(calculateInvoiceTotals(nextDraft));
    setNotice('New facture ready. It will be saved under the active company and client.');
  }

  function selectInvoice(invoiceId: string) {
    setSentConfirmationInvoiceId('');
    setSelectedInvoiceId(invoiceId);
    setInvoiceDetailsReloadKey((current) => current + 1);
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
          invoiceDate: toDateInputValue(response.invoice.invoiceDate),
          paymentTerms: response.invoice.paymentTerms ?? 'MOIS-SUIV',
          lines: normalizeDraftLines(
            response.invoice.lines.map((line) => ({
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitRateCents / 100,
            })),
          ),
          gstRate: 5,
          qstRate: 9.975,
        };
        setDraft(loadedDraft);
        setTotals(calculateInvoiceTotals(loadedDraft));
        if (response.invoice.companyId) {
          setSelectedCompanyId(response.invoice.companyId);
          setCompany((currentCompany) =>
            companies.find((candidate) => candidate.id === response.invoice.companyId) ?? currentCompany,
          );
          setIsEditingCompany(false);
        }
        if (response.invoice.clientId) {
          setSelectedClientId(response.invoice.clientId);
          setClient((currentClient) =>
            clients.find((candidate) => candidate.id === response.invoice.clientId) ?? currentClient,
          );
          setIsEditingClient(false);
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
  }, [clients, companies, invoiceDetailsReloadKey, selectedInvoiceId]);

  async function saveCompany(nextCompany: CompanyProfile) {
    try {
      const legalName = nextCompany.legalName.trim() || nextCompany.name?.trim() || '';
      if (!legalName) {
        setNotice('Enter at least a business or legal name before saving the company.');
        return;
      }

      const payload = {
        legalName,
        name: nextCompany.name?.trim() || legalName,
        companyNumber: nextCompany.companyNumber,
        email: nextCompany.email ?? '',
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
      setIsEditingCompany(false);
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
        contactName: nextClient.contactName ?? '',
        billingAddress: nextClient.billingAddress,
        email: nextClient.email,
      };
      const response = nextClient.id
        ? await patchJson<{ client: ClientProfile }, typeof payload>(`/clients/${nextClient.id}`, payload)
        : await postJson<{ client: ClientProfile }, typeof payload>('/clients', payload);
      const savedClient = { ...nextClient, ...response.client };
      setClient(savedClient);
      setSelectedClientId(savedClient.id ?? '');
      setIsEditingClient(false);
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
    setSentConfirmationInvoiceId('');
    try {
      const activeCompany = companies.find((candidate) => candidate.id === selectedCompanyId) ?? company;
      if (!activeCompany.id || !client.id) {
        setNotice('Select or save a company and save a client before creating an invoice.');
        return;
      }
      const apiLines = invoiceLinesForApi(nextDraft);
      if (apiLines.length === 0) {
        setNotice('Add at least one facture line with description, quantity, and unit price before saving.');
        return;
      }

      const payload = {
        companyId: activeCompany.id,
        clientId: client.id,
        invoiceNumber: nextDraft.invoiceNumber,
        documentReference: nextDraft.invoiceNumber,
        resourceName: 'Services',
        paymentTerms: nextDraft.paymentTerms,
        invoiceDate: toDateInputValue(nextDraft.invoiceDate),
        lines: apiLines,
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
      setInvoiceDetailsReloadKey((current) => current + 1);
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
      setSentConfirmationInvoiceId(selectedInvoiceId);
      setNotice('Invoice sent by email.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not send invoice.');
    }
  }

  async function handleMarkInvoicePaid(invoiceId: string, paidAt: string) {
    try {
      const response = await markInvoicePaid(invoiceId, paidAt);
      setInvoices((current) =>
        current.map((invoice) =>
          invoice.id === invoiceId ? { ...invoice, status: response.invoice.status, paidAt: response.invoice.paidAt } : invoice,
        ),
      );
      setNotice(`Facture marquee payee le ${response.invoice.paidAt ?? paidAt}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not mark facture as paid.');
    }
  }

  async function deleteInvoice(invoiceId: string) {
    const invoice = invoices.find((candidate) => candidate.id === invoiceId);
    if (!invoice) return;

    const message =
      invoice.status === 'draft'
        ? 'Delete this draft permanently?'
        : 'Delete this sent facture from active history? It will remain available when deleted factures are shown.';
    if (!window.confirm(message)) return;

    try {
      type DeleteInvoiceResponse = { invoice: BackendInvoice };
      const response = await deleteJson<DeleteInvoiceResponse>(`/invoices/${invoiceId}`);
      if (response?.invoice) {
        const deletedInvoice = mapInvoiceSummary(response.invoice);
        setInvoices((current) => current.map((candidate) => (candidate.id === invoiceId ? deletedInvoice : candidate)));
        setNotice('Facture soft deleted. Turn on deleted factures in history to see it.');
      } else {
        setInvoices((current) => current.filter((candidate) => candidate.id !== invoiceId));
        setNotice('Draft facture permanently deleted.');
      }
      if (selectedInvoiceId === invoiceId) {
        setSelectedInvoiceId('');
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not delete facture.');
    }
  }

  async function toggleDeletedInvoices(shouldShowDeleted: boolean) {
    setShowDeletedInvoices(shouldShowDeleted);
    try {
      const path = shouldShowDeleted ? '/invoices?includeDeleted=true' : '/invoices';
      const response = await fetchJson<{ invoices: BackendInvoice[] }>(path);
      const loadedInvoices = response.invoices.map(mapInvoiceSummary);
      setInvoices(loadedInvoices);
      if (!loadedInvoices.some((invoice) => invoice.id === selectedInvoiceId)) {
        setSelectedInvoiceId('');
      }
      setNotice(shouldShowDeleted ? 'Deleted factures are visible in history.' : 'Showing active factures only.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not reload facture history.');
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
    invoiceNumber: copy.noInvoice,
    clientName: client.name || copy.noClient,
    invoiceDate: draft.invoiceDate,
    status: 'draft',
  };
  const activeCompany = companies.find((candidate) => candidate.id === selectedCompanyId) ?? company;
  const activeCompanyName = activeCompany.legalName || activeCompany.name || copy.noCompany;
  const activeClientName = client.name || copy.noClient;
  const readyForFacture = Boolean(activeCompany.id && client.id);
  const issueBlockers = getInvoiceIssueBlockers(activeCompany, client, draft, totals);
  const canIssueInvoice = canUsePersistedInvoice && issueBlockers.length === 0;
  const hasNotice = notice.length > 0;
  const isPassiveNotice = notice.startsWith('Sign in with Google');

  React.useEffect(() => {
    if (isPassiveNotice) {
      setIsToastVisible(false);
      return;
    }

    setIsToastVisible(true);
    const timeout = window.setTimeout(() => setIsToastVisible(false), 4200);
    return () => window.clearTimeout(timeout);
  }, [isPassiveNotice, notice]);

  return (
    <div className={`app-shell${userEmail ? ' is-signed-in' : ''}`}>
      <main className="workspace" id="dashboard">
        <header className="studio-hero">
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true">
              F
            </div>
            <div>
              <p>{copy.privateOffice}</p>
              <span>{appName}</span>
            </div>
          </div>

          <div className="hero-copy">
            <span className="section-kicker">{copy.domain}</span>
            <h1>{copy.title}</h1>
            <p>{copy.subtitle}</p>
          </div>

          <div className="hero-actions">
            <label className="language-select">
              {copy.language}
              <select
                value={interfaceLanguage}
                onChange={(event) => setInterfaceLanguage(event.target.value as InterfaceLanguage)}
              >
                {interfaceLanguages.map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary-button" type="button" onClick={loginWithGoogle}>
              <LogIn size={16} aria-hidden="true" />
              {userEmail ? userEmail : copy.signIn}
            </button>
          </div>
        </header>

        <section className="context-ribbon" aria-label={copy.activeContext}>
          <article>
            <span>{copy.activeCompany}</span>
            <strong>{activeCompanyName}</strong>
          </article>
          <article>
            <span>{copy.client}</span>
            <strong>{summaryInvoice.clientName}</strong>
          </article>
          <article>
            <span>{copy.facture}</span>
            <strong>{summaryInvoice.invoiceNumber}</strong>
          </article>
          <article>
            <span>{copy.readiness}</span>
            <strong>{readyForFacture ? copy.readyToSave : copy.companyClientNeeded}</strong>
          </article>
        </section>

        {hasNotice ? (
          <p
            className={`notice-bar${isPassiveNotice ? ' notice-bar-passive' : ''}${isToastVisible ? ' notice-bar-toast-visible' : ''}`}
            role="status"
          >
            {notice}
          </p>
        ) : null}

        <section className="workflow-board" aria-label={copy.workflow}>
          <div className="workflow-column">
            <section className="panel workflow-step context-panel" aria-label="Company workflow step">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">{copy.step1}</span>
                  <h2>{copy.selectCompanyTitle}</h2>
                </div>
                <Building2 size={20} aria-hidden="true" />
              </div>

              <label>
                {copy.selectCompany}
                <select
                  value={selectedCompanyId}
                  onChange={(event) => selectCompany(event.target.value)}
                  aria-label={copy.selectCompany}
                >
                  <option value="">{copy.newCompany}</option>
                  {companies.map((candidate) => (
                    <option key={candidate.id ?? candidate.legalName} value={candidate.id}>
                      {candidate.legalName || candidate.name || 'Untitled company'}
                    </option>
                  ))}
                </select>
              </label>

              <button className="secondary-button" type="button" onClick={startNewCompany}>
                <Plus size={16} aria-hidden="true" />
                {copy.addCompany}
              </button>

              {selectedCompanyId && !isEditingCompany ? (
                <article className="selected-summary company-summary" aria-label={copy.selectedCompanySummary}>
                  <div className="supplier-card" aria-label="Selected supplier summary">
                    <span className="supplier-card-title">{copy.supplier}</span>
                    <strong>{activeCompanyName}</strong>
                    <p>{activeCompany.address || copy.noAddress}</p>
                    <p>TPS : {activeCompany.gstNumber || copy.missing}</p>
                    <p>TVQ : {activeCompany.qstNumber || copy.missing}</p>
                    <p>{copy.companyEmail} : {activeCompany.email || copy.noEmail}</p>
                  </div>
                  <div className="company-summary-actions">
                    <button className="secondary-button compact-button" type="button" onClick={() => setIsEditingCompany(true)}>
                      <Pencil size={15} aria-hidden="true" />
                      {copy.editCompany}
                    </button>
                  </div>
                </article>
              ) : null}
            </section>

            {isEditingCompany ? (
              <CompanyForm company={company} onSave={(nextCompany) => void saveCompany(nextCompany)} />
            ) : null}

            <section className="panel workflow-step" aria-label="Client workflow step">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">{copy.step2}</span>
                  <h2>{copy.selectClientTitle}</h2>
                </div>
                <UserRoundPlus size={20} aria-hidden="true" />
              </div>

              <div className="client-picker">
                <label>
                  {copy.selectClient}
                  <select
                    value={selectedClientId}
                    onChange={(event) => selectClient(event.target.value)}
                    aria-label={copy.selectClient}
                  >
                    <option value="">{copy.newClient}</option>
                    {clients.map((candidate) => (
                      <option key={candidate.id ?? candidate.name} value={candidate.id}>
                        {candidate.name || 'Untitled client'}
                      </option>
                    ))}
                  </select>
                </label>

                <button className="secondary-button" type="button" onClick={startNewClient}>
                  <Plus size={16} aria-hidden="true" />
                  {copy.addClient}
                </button>
              </div>

              {clients.length > 0 ? (
                <div className="saved-client-list" role="group" aria-label="Saved clients">
                  {clients.map((candidate) => (
                    <button
                      className={candidate.id === selectedClientId ? 'saved-client selected' : 'saved-client'}
                      key={candidate.id ?? candidate.name}
                      type="button"
                      onClick={() => selectClient(candidate.id ?? '')}
                    >
                      <strong>{candidate.name || 'Untitled client'}</strong>
                      <span>{candidate.email || copy.noEmail}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="empty-helper">{copy.noSavedClients}</p>
              )}

              {selectedClientId && !isEditingClient ? (
                <article className="selected-summary">
                  <CheckCircle2 size={18} aria-hidden="true" />
                  <div>
                    <strong>{activeClientName}</strong>
                    <span>{client.email || copy.noEmail}</span>
                    <span>{client.billingAddress || copy.noBillingAddress}</span>
                  </div>
                  <button className="secondary-button compact-button" type="button" onClick={() => setIsEditingClient(true)}>
                    <Pencil size={15} aria-hidden="true" />
                    {copy.editClient}
                  </button>
                </article>
              ) : null}
            </section>

            {isEditingClient || !selectedClientId ? (
              <ClientForm
                client={client}
                clients={clients}
                selectedClientId={selectedClientId}
                onSelectClient={selectClient}
                onStartNewClient={startNewClient}
                onSave={(nextClient) => void saveClient(nextClient)}
                showPicker={false}
              />
            ) : null}
          </div>

          <section className="workflow-step compose-step" id="invoices" aria-label="Fill the facture">
            <div className="panel-heading workflow-step-heading">
              <div>
                <span className="section-kicker">{copy.step3}</span>
                <h2>{copy.fillInvoiceTitle}</h2>
              </div>
              <FileText size={20} aria-hidden="true" />
            </div>
            <button className="primary-button full-width-button" type="button" onClick={startNewInvoice}>
              <Plus size={16} aria-hidden="true" />
              {copy.createInvoice}
            </button>
            <InvoiceEditor
              draft={draft}
              onSave={(nextDraft) => void saveInvoice(nextDraft)}
              onDraftChange={handleDraftChange}
            />
          </section>

          <section className="workflow-step preview-step" aria-label="Preview and send">
            <div className="panel-heading preview-step-heading">
              <div>
                <span className="section-kicker">{copy.step4}</span>
                <h2>{copy.previewSendTitle}</h2>
              </div>
            </div>
            <InvoicePreview
              draft={draft}
              totals={totals}
              company={activeCompany}
              client={client}
              copy={copy}
              canSend={canIssueInvoice}
              issueBlockers={canUsePersistedInvoice ? issueBlockers : []}
              pdfUrl={canIssueInvoice ? getInvoicePdfPreviewUrl(selectedInvoiceId) : undefined}
              onOpenPdf={handleOpenPdf}
              onSend={() => void handleSendInvoice()}
              sendConfirmation={sentConfirmationInvoiceId === selectedInvoiceId ? copy.sentConfirmation : undefined}
            />
          </section>
        </section>

        <section className="history-section">
          <InvoiceList
            invoices={invoices}
            selectedInvoiceId={selectedInvoiceId}
            onSelectInvoice={selectInvoice}
            onStartNewInvoice={startNewInvoice}
            onDeleteInvoice={(invoiceId) => void deleteInvoice(invoiceId)}
            onMarkPaid={(invoiceId, paidAt) => void handleMarkInvoicePaid(invoiceId, paidAt)}
            showDeleted={showDeletedInvoices}
            onToggleDeleted={(checked) => void toggleDeletedInvoices(checked)}
            reportUrl={getIssuedInvoiceReportUrl()}
            batchExportUrl={getSentInvoiceBatchExportUrl()}
            showNewButton={false}
          />
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
    paidAt: invoice.paidAt ?? null,
    deletedAt: invoice.deletedAt ?? null,
  };
}

function createNextInvoiceDraft(invoices: InvoiceSummary[]): InvoiceDraft {
  const currentYear = initialDraft.invoiceDate.slice(0, 4);
  const maxSequence = invoices.reduce((max, invoice) => {
    const match = invoice.invoiceNumber.match(new RegExp(`^${currentYear}-(\\d+)$`));
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  const nextSequence = String(maxSequence + 1).padStart(3, '0');

  return {
    ...initialDraft,
    invoiceNumber: `${currentYear}-${nextSequence}`,
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
  if (!draft.lines.some((line) => line.description.trim() && line.quantity > 0 && line.unitPrice > 0)) {
    blockers.push('service description');
  }
  if (totals.totalCents <= 0) blockers.push('total payable');
  return blockers;
}

function normalizeDraftLines(lines: InvoiceDraft['lines']) {
  return lines.length > 0 ? lines : [{ description: '', quantity: 0, unitPrice: 0 }];
}

function invoiceLinesForApi(draft: InvoiceDraft) {
  const filledLines = draft.lines
    .filter((line) => line.description.trim() || line.quantity > 0 || line.unitPrice > 0)
    .map((line) => ({
      description: line.description.trim(),
      serviceDate: toDateInputValue(draft.invoiceDate),
      quantity: line.quantity,
      unitRateCents: Math.round(line.unitPrice * 100),
    }));

  return filledLines.filter((line) => line.description && line.quantity > 0 && line.unitRateCents > 0);
}

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<App />);
}
