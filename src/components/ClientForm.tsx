import { Plus, Save, UserRoundPlus } from 'lucide-react';
import React from 'react';
import type { ClientProfile } from '../types';

interface ClientFormProps {
  client: ClientProfile;
  clients: ClientProfile[];
  selectedClientId: string;
  onSelectClient: (clientId: string) => void;
  onStartNewClient: () => void;
  onSave: (client: ClientProfile) => void;
}

export function ClientForm({
  client,
  clients,
  selectedClientId,
  onSelectClient,
  onStartNewClient,
  onSave,
}: ClientFormProps) {
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
          <span className="section-kicker">Step 2</span>
          <h2>Choose client</h2>
        </div>
        <UserRoundPlus size={20} aria-hidden="true" />
      </div>

      <div className="client-picker">
        <label>
          Select client
          <select
            value={selectedClientId}
            onChange={(event) => onSelectClient(event.target.value)}
            aria-label="Select client"
          >
            <option value="">New client</option>
            {clients.map((candidate) => (
              <option key={candidate.id ?? candidate.name} value={candidate.id}>
                {candidate.name || 'Untitled client'}
              </option>
            ))}
          </select>
        </label>

        <button className="secondary-button" type="button" onClick={onStartNewClient}>
          <Plus size={16} aria-hidden="true" />
          Add client
        </button>
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
          Email for sending
          <input
            type="email"
            value={draftClient.email}
            onChange={(event) => updateClient('email', event.target.value)}
          />
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
