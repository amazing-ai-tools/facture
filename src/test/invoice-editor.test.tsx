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

    fireEvent.change(screen.getByLabelText('Hours'), { target: { value: '40.5' } });
    fireEvent.change(screen.getByLabelText('Hourly rate'), { target: { value: '94' } });

    expect(screen.getByText('$4,377.10')).toBeInTheDocument();
  });

  it('specifies payment terms on the facture details form', () => {
    const savedDrafts: unknown[] = [];
    render(<InvoiceEditor onSave={(draft) => savedDrafts.push(draft)} />);

    fireEvent.change(screen.getByLabelText('Payment terms'), { target: { value: 'NET 15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save facture' }));

    expect(savedDrafts[0]).toMatchObject({ paymentTerms: 'NET 15' });
  });

  it('does not put interface language on the facture details form', () => {
    const savedDrafts: unknown[] = [];
    render(<InvoiceEditor onSave={(draft) => savedDrafts.push(draft)} />);

    expect(screen.queryByLabelText('Language')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save facture' }));

    expect(savedDrafts[0]).not.toHaveProperty('language');
  });
});
