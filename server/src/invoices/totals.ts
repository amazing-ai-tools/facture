export interface InvoiceLineInput {
  quantity: number;
  unitRateCents: number;
}

export interface InvoiceTotalInput {
  lines: InvoiceLineInput[];
  gstRate: number;
  qstRate: number;
}

export interface InvoiceTotals {
  subtotalCents: number;
  gstCents: number;
  qstCents: number;
  totalCents: number;
}

function roundCents(value: number) {
  return Math.round(value);
}

export function calculateInvoiceTotals(input: InvoiceTotalInput): InvoiceTotals {
  const subtotalCents = input.lines.reduce(
    (sum, line) => sum + roundCents(line.quantity * line.unitRateCents),
    0,
  );
  const gstCents = roundCents(subtotalCents * input.gstRate);
  const qstCents = roundCents(subtotalCents * input.qstRate);

  return {
    subtotalCents,
    gstCents,
    qstCents,
    totalCents: subtotalCents + gstCents + qstCents,
  };
}
