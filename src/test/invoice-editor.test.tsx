import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InvoiceEditor } from '../components/InvoiceEditor';

describe('InvoiceEditor', () => {
  it('calculates sample invoice total in the form', () => {
    render(<InvoiceEditor onSave={() => undefined} />);

    fireEvent.change(screen.getByLabelText('Hours'), { target: { value: '40.5' } });
    fireEvent.change(screen.getByLabelText('Hourly rate'), { target: { value: '94' } });

    expect(screen.getByText('$4,377.10')).toBeInTheDocument();
  });
});
