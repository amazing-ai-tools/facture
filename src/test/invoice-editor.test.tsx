import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { InvoiceEditor } from '../components/InvoiceEditor';

describe('InvoiceEditor', () => {
  afterEach(() => {
    cleanup();
  });

  it('calculates sample invoice total in the form', () => {
    render(<InvoiceEditor onSave={() => undefined} />);

    fireEvent.change(screen.getByLabelText('Quantite 1'), { target: { value: '40.5' } });
    fireEvent.change(screen.getByLabelText('Prix unit. ($) 1'), { target: { value: '94' } });

    expect(screen.getByText('$4,377.10')).toBeInTheDocument();
  });

  it('specifies payment terms on the facture details form', () => {
    const savedDrafts: unknown[] = [];
    render(<InvoiceEditor onSave={(draft) => savedDrafts.push(draft)} />);

    fireEvent.change(screen.getByLabelText('Echeance'), { target: { value: 'NET 15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save facture' }));

    expect(savedDrafts[0]).toMatchObject({ paymentTerms: 'NET 15' });
  });

  it('matches the Excel facture model fields and saves multiple line items', () => {
    const savedDrafts: unknown[] = [];
    render(<InvoiceEditor onSave={(draft) => savedDrafts.push(draft)} />);

    expect(screen.getByLabelText('Facture no')).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Echeance')).toBeInTheDocument();
    expect(screen.getByLabelText('Description 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Quantite 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Prix unit. ($) 1')).toBeInTheDocument();
    expect(screen.queryByLabelText('Document reference')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Resource name')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Hours')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Hourly rate')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Description 1'), { target: { value: "Main d'oeuvre" } });
    fireEvent.change(screen.getByLabelText('Quantite 1'), { target: { value: '40.5' } });
    fireEvent.change(screen.getByLabelText('Prix unit. ($) 1'), { target: { value: '94' } });
    fireEvent.change(screen.getByLabelText('Description 2'), { target: { value: 'Frais administratifs' } });
    fireEvent.change(screen.getByLabelText('Quantite 2'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Prix unit. ($) 2'), { target: { value: '100' } });

    expect(screen.getByText('$4,492.07')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save facture' }));

    expect(savedDrafts[0]).toMatchObject({
      invoiceNumber: '2026-001',
      paymentTerms: '30 jours',
      lines: expect.arrayContaining([
        { description: "Main d'oeuvre", quantity: 40.5, unitPrice: 94 },
        { description: 'Frais administratifs', quantity: 1, unitPrice: 100 },
      ]),
    });
  });

  it('does not put interface language on the facture details form', () => {
    const savedDrafts: unknown[] = [];
    render(<InvoiceEditor onSave={(draft) => savedDrafts.push(draft)} />);

    expect(screen.queryByLabelText('Language')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save facture' }));

    expect(savedDrafts[0]).not.toHaveProperty('language');
  });
});
