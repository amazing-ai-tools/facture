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
  showPicker?: boolean;
}

export function ClientForm({
  client,
  clients,
  selectedClientId,
  onSelectClient,
  onStartNewClient,
  onSave,
  showPicker = true,
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

      {showPicker ? (
        <>
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

          {clients.length > 0 ? (
            <div className="saved-client-list" role="group" aria-label="Saved clients">
              {clients.map((candidate) => (
                <button
                  className={candidate.id === selectedClientId ? 'saved-client selected' : 'saved-client'}
                  key={candidate.id ?? candidate.name}
                  type="button"
                  onClick={() => onSelectClient(candidate.id ?? '')}
                >
                  <strong>{candidate.name || 'Untitled client'}</strong>
                  <span>{candidate.email || 'No email yet'}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="empty-helper">No saved clients yet. Add the client once, then select it here for future factures.</p>
          )}
        </>
      ) : null}

      <div className="field-grid">
        <label>
          Nom du client
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
          Adresse du client
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
