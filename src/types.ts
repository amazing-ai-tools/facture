export interface CompanyProfile {
  id?: string;
  name?: string;
  legalName: string;
  companyNumber: string;
  email?: string;
  phone?: string;
  gstNumber: string;
  qstNumber: string;
  defaultHourlyRateCents: number;
  address: string;
}

export interface ClientProfile {
  id?: string;
  name: string;
  contactName?: string;
  email: string;
  billingAddress: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid';
export type InterfaceLanguage = 'fr-QC' | 'en' | 'pt-BR';

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  clientName: string;
  invoiceDate: string;
  totalCents: number;
  status: InvoiceStatus;
  deletedAt?: string | null;
}

export interface InvoiceDraft {
  invoiceNumber: string;
  invoiceDate: string;
  paymentTerms: string;
  lines: InvoiceDraftLine[];
  gstRate: number;
  qstRate: number;
}

export interface InvoiceDraftLine {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceTotals {
  subtotalCents: number;
  gstCents: number;
  qstCents: number;
  totalCents: number;
}
