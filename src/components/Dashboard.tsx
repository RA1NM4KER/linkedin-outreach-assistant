"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { QueueList } from "@/components/QueueList";
import { EventImportPanel } from "@/components/EventImportPanel";
import { nextPendingBatch } from "@/lib/queue";
import { interpolateTemplate } from "@/lib/template";
import { CONTACT_STATUSES, type BatchSendResult, type Contact, type ContactStatus, type ImportResult, type PublicState } from "@/types";

interface DashboardProps {
  initialState: PublicState;
}

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? `Request failed (${response.status}).`);
  return payload;
}

export function Dashboard({ initialState }: DashboardProps) {
  const [state, setState] = useState(initialState);
  const [templateDraft, setTemplateDraft] = useState(initialState.template);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ContactStatus | "all">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [eventImportBusy, setEventImportBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const current = state.contacts.find((contact) => contact.id === state.currentContactId) ?? null;
  const preview = current ? interpolateTemplate(templateDraft, current) : "Import contacts to see a personalized preview.";
  const templateDirty = templateDraft !== state.template;
  const testBatch = useMemo(() => nextPendingBatch(state.contacts, state.currentContactId, 5), [state.contacts, state.currentContactId]);

  const filteredContacts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return state.contacts.filter((contact) => {
      const matchesFilter = filter === "all" || contact.status === filter;
      const matchesSearch = !term || contact.fullName.toLowerCase().includes(term) || contact.linkedinUrl.toLowerCase().includes(term);
      return matchesFilter && matchesSearch;
    });
  }, [filter, search, state.contacts]);

  const refresh = useCallback(async () => {
    const nextState = await jsonRequest<PublicState>("/api/state", { cache: "no-store" });
    setState(nextState);
    setTemplateDraft(nextState.template);
    return nextState;
  }, []);

  const saveTemplate = useCallback(async () => {
    if (!templateDraft.trim()) throw new Error("Template cannot be empty.");
    await jsonRequest("/api/template", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template: templateDraft }),
    });
  }, [templateDraft]);

  const sendContact = useCallback(async (contact: Contact) => {
    setBusy("send");
    setNotice({ kind: "info", text: `Sending to ${contact.fullName}. LinkedIn may take a moment to open.` });
    try {
      if (templateDraft !== state.template) await saveTemplate();
      await jsonRequest("/api/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: contact.id }),
      });
      await refresh();
      setNotice({ kind: "success", text: `Message sent to ${contact.fullName}. LinkedIn closed and the next contact is ready.` });
    } catch (error) {
      await refresh().catch(() => undefined);
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Automation failed." });
    } finally {
      setBusy(null);
    }
  }, [refresh, saveTemplate, state.template, templateDraft]);

  const sendNext = useCallback(async () => {
    const pending = current && (current.status === "pending" || current.status === "failed")
      ? current
      : state.contacts.find((contact) => contact.status === "pending" || contact.status === "failed");
    if (!pending) {
      setNotice({ kind: "info", text: "There are no pending or failed contacts left to send." });
      return;
    }
    await sendContact(pending);
  }, [current, sendContact, state.contacts]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        void sendNext();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sendNext]);

  async function runAction(key: string, action: () => Promise<void>, success?: string) {
    setBusy(key);
    setNotice(null);
    try {
      await action();
      await refresh();
      if (success) setNotice({ kind: "success", text: success });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Something went wrong." });
    } finally {
      setBusy(null);
    }
  }

  function changeStatus(status: ContactStatus) {
    if (!current) return;
    void runAction("status", async () => {
      await jsonRequest(`/api/contacts/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    }, status === "sent" ? "Marked sent. The next pending contact is selected." : `Marked ${status}.`);
  }

  function move(direction: "next" | "previous") {
    void runAction("navigate", async () => {
      await jsonRequest("/api/navigation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
    });
  }

  function selectContact(id: string) {
    void runAction("navigate", async () => {
      await jsonRequest("/api/navigation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: id }),
      });
    });
  }

  function removeQueueContact(contact: Contact) {
    const confirmed = window.confirm(
      `Remove ${contact.fullName} from the queue?\n\nThis can't be undone. They will also be excluded from future imports.`,
    );
    if (!confirmed) return;

    void runAction("remove", async () => {
      await jsonRequest(`/api/contacts/${contact.id}`, { method: "DELETE" });
    }, `${contact.fullName} was removed and excluded from future imports.`);
  }

  async function copyPreparedMessage() {
    try {
      await navigator.clipboard.writeText(preview);
      setNotice({ kind: "success", text: `Message for ${current?.fullName ?? "the current contact"} copied.` });
    } catch {
      setNotice({ kind: "error", text: "Could not access the clipboard. Check your browser's clipboard permission." });
    }
  }

  async function sendFiveTestMessages() {
    if (testBatch.length === 0) {
      setNotice({ kind: "info", text: "There are no pending contacts available for a test batch." });
      return;
    }
    const names = testBatch.map((contact, index) => `${index + 1}. ${contact.fullName}`).join("\n");
    const confirmed = window.confirm(
      `Automatically send ${testBatch.length} LinkedIn message${testBatch.length === 1 ? "" : "s"}?\n\n${names}\n\nThis will click LinkedIn's Send button. Sent messages cannot be undone. The batch stops at the first error.`,
    );
    if (!confirmed) return;

    setBusy("batch-send");
    setNotice({ kind: "info", text: `Sending a test batch of ${testBatch.length}. Keep the automated Brave window open.` });
    try {
      if (templateDirty) await saveTemplate();
      const result = await jsonRequest<BatchSendResult>("/api/send-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: testBatch.map((contact) => contact.id) }),
      });
      await refresh();
      if (result.failed) {
        setNotice({
          kind: "error",
          text: `${result.sent.length} sent before stopping at ${result.failed.fullName}: ${result.failed.error}`,
        });
      } else {
        setNotice({ kind: "success", text: `${result.sent.length} test messages sent. Review them in LinkedIn before starting another batch.` });
      }
    } catch (error) {
      await refresh().catch(() => undefined);
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "The test batch failed." });
    } finally {
      setBusy(null);
    }
  }

  async function importFile(file: File) {
    setBusy("import");
    setNotice(null);
    try {
      const result = await jsonRequest<ImportResult>("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText: await file.text() }),
      });
      await refresh();
      const details = [`${result.imported} imported`, `${result.duplicates} duplicate${result.duplicates === 1 ? "" : "s"} skipped`, `${result.invalid} invalid`];
      setNotice({ kind: result.imported > 0 ? "success" : "info", text: `${details.join(" · ")}${result.errors[0] ? `. ${result.errors[0]}` : ""}` });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Import failed." });
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function resetProject() {
    if (!window.confirm("Delete every local contact, status, and saved template? This cannot be undone.")) return;
    void runAction("reset", async () => {
      await jsonRequest("/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "RESET" }),
      });
    }, "Local project data was reset.");
  }

  const disabled = busy !== null || eventImportBusy;
  const latestEventImport = state.eventImports.at(-1);

  return (
    <main className="app-shell">
      <header className="topbar">
        <Link className="brand-lockup" href="/" aria-label="LinkedIn Outreach dashboard">
          <BrandMark />
          <div className="topbar-copy">
            <p className="eyebrow">Campaign workspace</p>
            <h1>LinkedIn Outreach</h1>
            <p className="subtitle">Review contacts, personalize outreach, and keep every send human-approved.</p>
          </div>
        </Link>
        <div className="header-actions">
          <input
            accept=".csv,text/csv"
            className="visually-hidden"
            onChange={(event) => event.target.files?.[0] && void importFile(event.target.files[0])}
            ref={fileInput}
            type="file"
          />
          <button className="button secondary" disabled={disabled} onClick={() => fileInput.current?.click()} type="button">
            {busy === "import" ? "Importing…" : "Import CSV"}
          </button>
          <a className="button ghost" href="/api/export" download>Export CSV</a>
        </div>
      </header>

      {notice && <div className={`notice notice-${notice.kind}`} role="status">{notice.text}</div>}

      <EventImportPanel
        disabled={busy !== null}
        latestImport={latestEventImport}
        onBusyChange={setEventImportBusy}
        onComplete={async (result) => {
          await refresh();
          setNotice({
            kind: "success",
            text: `${result.attendeeCount} attendees found · ${result.newContacts} new · ${result.duplicates} duplicate${result.duplicates === 1 ? "" : "s"} skipped. Review the queue before outreach.`,
          });
        }}
        onError={(message) => setNotice({ kind: "error", text: message })}
      />

      <section className="metrics" aria-label="Outreach progress">
        <article><span>Sent</span><strong>{state.counts.sent}</strong><small>of {state.counts.total}</small></article>
        <article><span>Remaining</span><strong>{state.counts.remaining}</strong><small>pending action</small></article>
        <article><span>Prepared</span><strong>{state.counts.prepared}</strong><small>awaiting your send</small></article>
        <div className="progress-track" aria-label={`${state.counts.sent} of ${state.counts.total} sent`}>
          <span style={{ width: `${state.counts.total ? (state.counts.sent / state.counts.total) * 100 : 0}%` }} />
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="panel current-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Current contact</p>
              <h2>{current?.fullName ?? "No contact selected"}</h2>
            </div>
            {current && <span className={`status-pill status-${current.status}`}>{current.status}</span>}
          </div>

          {current ? (
            <>
              <a className="profile-link" href={current.linkedinUrl} target="_blank" rel="noreferrer">{current.linkedinUrl.replace(/^https?:\/\/(www\.)?/, "")} ↗</a>
              <div className="message-block">
                <div className="message-label">
                  <span>Prepared message</span>
                  <div className="message-tools">
                    <span>{preview.length} characters</span>
                    <button onClick={() => void copyPreparedMessage()} type="button">Copy</button>
                  </div>
                </div>
                <pre>{preview}</pre>
              </div>
              <div className="primary-actions">
                <button className="button batch" disabled={disabled || testBatch.length === 0} onClick={() => void sendFiveTestMessages()} type="button">
                  {busy === "batch-send" ? "Sending test batch…" : `Send ${testBatch.length || 5} Test Messages`}
                </button>
                <button className="button primary" disabled={disabled || current.status === "sent" || current.status === "skipped"} onClick={() => void sendContact(current)} type="button">
                  {busy === "send" ? "Sending in LinkedIn…" : current.status === "failed" ? "Retry Send" : "Send in LinkedIn"}
                </button>
                <button className="button success" disabled={disabled} onClick={() => changeStatus("sent")} type="button">Mark Sent</button>
                <button className="button secondary" disabled={disabled} onClick={() => changeStatus("skipped")} type="button">Skip</button>
              </div>
              <p className="safety-note">Single sends click LinkedIn’s Send button immediately. Test batches require confirmation, stop on the first error, and are never retried automatically.</p>
              <div className="secondary-actions">
                <button disabled={disabled} onClick={() => move("previous")} type="button">← Previous</button>
                <button disabled={disabled} onClick={() => move("next")} type="button">Next →</button>
                <button disabled={disabled} onClick={() => changeStatus("pending")} type="button">Reset to pending</button>
              </div>
            </>
          ) : (
            <div className="empty-state"><strong>Import an event or CSV to begin</strong><p>Event attendees appear here for review before any outreach is prepared.</p></div>
          )}
        </section>

        <aside className="panel setup-panel">
          <div className="panel-heading">
            <div><p className="section-label">Reusable template</p><h2>Message template</h2></div>
            {templateDirty && <span className="unsaved">Unsaved</span>}
          </div>
          <textarea aria-label="Message template" onChange={(event) => setTemplateDraft(event.target.value)} rows={11} value={templateDraft} />
          <div className="placeholder-help"><code>{"{firstName}"}</code><code>{"{fullName}"}</code></div>
          <button
            className="button secondary full-width"
            disabled={disabled || !templateDirty || !templateDraft.trim()}
            onClick={() => void runAction("template", saveTemplate, "Template saved and messages regenerated.")}
            type="button"
          >
            {busy === "template" ? "Saving…" : "Save template"}
          </button>
          <hr />
          <p className="section-label">LinkedIn connection</p>
          <p className="help-copy">Your secure local browser session is reused between runs, so you only need to sign in once.</p>
          <button className="button secondary full-width" disabled={disabled} onClick={() => void runAction("browser", () => jsonRequest("/api/browser", { method: "POST" }), "LinkedIn opened. Log in there if needed.")} type="button">
            {busy === "browser" ? "Opening LinkedIn…" : "Open LinkedIn session"}
          </button>
          <button className="text-button" disabled={disabled} onClick={() => void runAction("check", async () => {
            const result = await jsonRequest<{ available: boolean; empty: boolean | null }>("/api/automation/status", { cache: "no-store" });
            setNotice({ kind: "info", text: !result.available ? "No open LinkedIn composer was detected." : result.empty ? "The composer is empty; the message may have been sent or cleared." : "The composer still contains text." });
          })} type="button">Check open composer</button>
        </aside>
      </div>

      <section className="panel queue-panel">
        <div className="queue-toolbar">
          <div><p className="section-label">Local source of truth</p><h2>Queue <span>{filteredContacts.length}</span></h2></div>
          <div className="queue-controls">
            <input aria-label="Search contacts" onChange={(event) => setSearch(event.target.value)} placeholder="Search name or URL…" type="search" value={search} />
            <select aria-label="Filter by status" onChange={(event) => setFilter(event.target.value as ContactStatus | "all")} value={filter}>
              <option value="all">All statuses</option>
              {CONTACT_STATUSES.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}
            </select>
            <button className="button primary compact" disabled={disabled || state.contacts.length === 0} onClick={() => void sendNext()} title="Keyboard shortcut: Alt+N" type="button">Send Next</button>
          </div>
        </div>
        <QueueList
          contacts={filteredContacts}
          currentId={state.currentContactId}
          disabled={disabled}
          onRemove={removeQueueContact}
          onSelect={selectContact}
        />
      </section>

      <footer className="app-footer">
        <span><strong>Local workspace</strong> · Your contact data stays on this device. <kbd>Alt</kbd> + <kbd>N</kbd> sends to the next contact.</span>
        <nav className="footer-actions" aria-label="Footer">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <a href="https://github.com/RA1NM4KER/linkedin-outreach-assistant/blob/main/LICENSE" rel="noreferrer" target="_blank">MIT License</a>
          <button className="danger-link" disabled={disabled} onClick={resetProject} type="button">Clear all local data</button>
        </nav>
      </footer>
    </main>
  );
}
