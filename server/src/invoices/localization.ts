export function invoicePdfLabels() {
  return {
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
  };
}

export function invoiceEmailContent(invoiceNumber: string) {
  return {
    subject: `Facture ${invoiceNumber}`,
    body: `Veuillez trouver la facture ${invoiceNumber} en piece jointe.`,
  };
}
