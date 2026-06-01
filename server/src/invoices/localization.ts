export type InvoiceLanguage = 'fr-QC' | 'en' | 'pt-BR';

export const invoiceLanguages = ['fr-QC', 'en', 'pt-BR'] as const;

export function normalizeInvoiceLanguage(value: unknown): InvoiceLanguage {
  return invoiceLanguages.includes(value as InvoiceLanguage) ? (value as InvoiceLanguage) : 'fr-QC';
}

export function invoiceLanguageLabel(language: InvoiceLanguage) {
  return {
    'fr-QC': 'Frances Quebec',
    en: 'English',
    'pt-BR': 'Portuguese Brazil',
  }[language];
}

export function invoicePdfLabels(language: InvoiceLanguage) {
  return {
    'fr-QC': {
      documentTitle: 'FACTURE',
      date: 'Date',
      terms: 'Modalites',
      billTo: 'Facture a',
      details: 'Details de la facture',
      documentReference: 'Document',
      resource: 'Ressource',
      description: 'Description',
      serviceDate: 'Date de service',
      quantity: 'Qte',
      rate: 'Taux',
      amount: 'Montant',
      subtotal: 'Sous-total',
      gst: 'TPS',
      qst: 'TVQ',
      totalToPay: 'Total a payer',
      paymentNote: 'Veuillez inclure le numero de facture avec le paiement.',
      thanks: 'Merci.',
    },
    en: {
      documentTitle: 'INVOICE',
      date: 'Date',
      terms: 'Terms',
      billTo: 'Bill To',
      details: 'Invoice Details',
      documentReference: 'Document ref',
      resource: 'Resource',
      description: 'Description',
      serviceDate: 'Service Date',
      quantity: 'Qty',
      rate: 'Rate',
      amount: 'Amount',
      subtotal: 'Subtotal',
      gst: 'GST',
      qst: 'QST',
      totalToPay: 'Total to pay',
      paymentNote: 'Please include the invoice number with payment.',
      thanks: 'Thank you.',
    },
    'pt-BR': {
      documentTitle: 'FATURA',
      date: 'Data',
      terms: 'Condicoes',
      billTo: 'Cobrar de',
      details: 'Detalhes da fatura',
      documentReference: 'Documento',
      resource: 'Recurso',
      description: 'Descricao',
      serviceDate: 'Data do servico',
      quantity: 'Qtd',
      rate: 'Valor',
      amount: 'Total',
      subtotal: 'Subtotal',
      gst: 'GST',
      qst: 'QST',
      totalToPay: 'Total a pagar',
      paymentNote: 'Inclua o numero da fatura no pagamento.',
      thanks: 'Obrigado.',
    },
  }[language];
}

export function invoiceEmailContent(language: InvoiceLanguage, invoiceNumber: string) {
  return {
    'fr-QC': {
      subject: `Facture ${invoiceNumber}`,
      body: `Veuillez trouver la facture ${invoiceNumber} en piece jointe.`,
    },
    en: {
      subject: `Invoice ${invoiceNumber}`,
      body: `Please find invoice ${invoiceNumber} attached.`,
    },
    'pt-BR': {
      subject: `Fatura ${invoiceNumber}`,
      body: `Segue em anexo a fatura ${invoiceNumber}.`,
    },
  }[language];
}
