import { Building2, Save } from 'lucide-react';
import React from 'react';
import type { CompanyProfile } from '../types';

interface CompanyFormProps {
  company: CompanyProfile;
  onSave: (company: CompanyProfile) => void;
}

export function CompanyForm({ company, onSave }: CompanyFormProps) {
  const [draftCompany, setDraftCompany] = React.useState(company);

  React.useEffect(() => {
    setDraftCompany(company);
  }, [company]);

  function updateCompany<Field extends keyof CompanyProfile>(field: Field, value: CompanyProfile[Field]) {
    setDraftCompany((currentCompany) => ({ ...currentCompany, [field]: value }));
  }

  return (
    <form
      className="panel stack"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(draftCompany);
      }}
    >
      <div className="panel-heading">
        <div>
          <span className="section-kicker">Company</span>
          <h2>Company profile</h2>
        </div>
        <Building2 size={20} aria-hidden="true" />
      </div>

      <div className="field-grid">
        <label>
          Supplier display name
          <input value={draftCompany.name ?? ''} onChange={(event) => updateCompany('name', event.target.value)} />
        </label>
        <label>
          Legal name
          <input value={draftCompany.legalName} onChange={(event) => updateCompany('legalName', event.target.value)} />
        </label>
        <label>
          NEQ
          <input value={draftCompany.companyNumber} onChange={(event) => updateCompany('companyNumber', event.target.value)} />
        </label>
        <label>
          Courriel
          <input
            type="email"
            value={draftCompany.email ?? ''}
            onChange={(event) => updateCompany('email', event.target.value)}
          />
        </label>
        <label>
          TPS
          <input value={draftCompany.gstNumber} onChange={(event) => updateCompany('gstNumber', event.target.value)} />
        </label>
        <label>
          TVQ
          <input value={draftCompany.qstNumber} onChange={(event) => updateCompany('qstNumber', event.target.value)} />
        </label>
        <label className="wide-field">
          Supplier address
          <textarea
            value={draftCompany.address}
            rows={3}
            onChange={(event) => updateCompany('address', event.target.value)}
          />
        </label>
      </div>

      <button className="secondary-button" type="submit">
        <Save size={16} aria-hidden="true" />
        Save company
      </button>
    </form>
  );
}
