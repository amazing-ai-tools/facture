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
export type InvoiceLanguage = 'fr-QC' | 'en' | 'pt-BR';

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
  language: InvoiceLanguage;
  documentReference: string;
  serviceDate: string;
  resourceName: string;
  paymentTerms: string;
  description: string;
  hours: number;
  hourlyRate: number;
  gstRate: number;
  qstRate: number;
}

export interface InvoiceTotals {
  subtotalCents: number;
  gstCents: number;
  qstCents: number;
  totalCents: number;
}
