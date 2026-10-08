import type { Contact, ContactStatus } from "@/types";

interface QueueListProps {
  contacts: Contact[];
  currentId: string | null;
  disabled?: boolean;
  onRemove: (contact: Contact) => void;
  onSelect: (id: string) => void;
}

const statusSymbols: Record<ContactStatus, string> = {
  pending: "○",
  prepared: "→",
  sent: "✓",
  skipped: "–",
  failed: "!",
};

export function QueueList({ contacts, currentId, disabled = false, onRemove, onSelect }: QueueListProps) {
  if (contacts.length === 0) return <div className="empty-row">No contacts match this view.</div>;

  return (
    <div className="queue-list">
      {contacts.map((contact) => (
        <div
          className={`queue-row ${contact.id === currentId ? "is-current" : ""}`}
          key={contact.id}
        >
          <button
            aria-label={`Select ${contact.fullName}`}
            className="queue-select"
            disabled={disabled}
            onClick={() => onSelect(contact.id)}
            type="button"
          >
            <span className={`status-symbol status-${contact.status}`} aria-hidden="true">{statusSymbols[contact.status]}</span>
            <span className="queue-person">
              <strong>{contact.fullName}</strong>
              <span>{contact.linkedinUrl.replace(/^https?:\/\/(www\.)?/, "")}</span>
              {contact.headline && <span className="queue-headline">{contact.headline}</span>}
            </span>
            <span className={`status-pill status-${contact.status}`}>{contact.status}</span>
          </button>
          <button
            aria-label={`Remove ${contact.fullName}`}
            className="queue-remove"
            disabled={disabled}
            onClick={() => onRemove(contact)}
            title={`Remove ${contact.fullName}`}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      ))}
    </div>
  );
}
