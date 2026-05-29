import { Save, UserRoundPlus } from 'lucide-react';
import React from 'react';
import type { ClientProfile } from '../types';

interface ClientFormProps {
  client: ClientProfile;
  onSave: (client: ClientProfile) => void;
}

export function ClientForm({ client, onSave }: ClientFormProps) {
  const [draftClient, setDraftClient] = React.useState(client);

  React.useEffect(() => {
    setDraftClient(client);
  }, [client]);

  function updateClient<Field extends keyof ClientProfile>(field: Field, value: ClientProfile[Field]) {
    setDraftClient((currentClient) => ({ ...currentClient, [field]: value }));
  }

  return (
    <form
      className="panel stack"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(draftClient);
      }}
    >
      <div className="panel-heading">
        <div>
          <span className="section-kicker">Client</span>
          <h2>Bill to</h2>
        </div>
        <UserRoundPlus size={20} aria-hidden="true" />
      </div>

      <div className="field-grid">
        <label>
          Client company
          <input value={draftClient.name} onChange={(event) => updateClient('name', event.target.value)} />
        </label>
        <label>
          Contact
          <input value={draftClient.contactName ?? ''} onChange={(event) => updateClient('contactName', event.target.value)} />
        </label>
        <label>
          Email
          <input value={draftClient.email} onChange={(event) => updateClient('email', event.target.value)} />
        </label>
        <label className="wide-field">
          Billing address
          <textarea
            value={draftClient.billingAddress}
            rows={3}
            onChange={(event) => updateClient('billingAddress', event.target.value)}
          />
        </label>
      </div>

      <button className="secondary-button" type="submit">
        <Save size={16} aria-hidden="true" />
        Save client
      </button>
    </form>
  );
}
