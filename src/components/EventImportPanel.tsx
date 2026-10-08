"use client";

import { useEffect, useRef, useState } from "react";
import type { EventImportJob, EventImportRecord, EventImportResult } from "@/types";

interface EventImportPanelProps {
  disabled: boolean;
  latestImport?: EventImportRecord;
  onBusyChange: (busy: boolean) => void;
  onComplete: (result: EventImportResult) => Promise<void>;
  onError: (message: string) => void;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? `Request failed (${response.status}).`);
  return payload;
}

export function EventImportPanel({ disabled, latestImport, onBusyChange, onComplete, onError }: EventImportPanelProps) {
  const [eventUrl, setEventUrl] = useState(latestImport?.eventUrl ?? "");
  const [job, setJob] = useState<EventImportJob | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function pollJob(jobId: string): Promise<void> {
    try {
      while (mounted.current) {
        const current = await requestJson<EventImportJob>(`/api/event-import/${jobId}`, { cache: "no-store" });
        if (!mounted.current) return;
        setJob(current);
        if (current.stage === "complete" && current.result) {
          onBusyChange(false);
          await onComplete(current.result);
          return;
        }
        if (current.stage === "failed") {
          onBusyChange(false);
          onError(current.error ?? "LinkedIn event import failed.");
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 750));
      }
    } catch (error) {
      onBusyChange(false);
      onError(error instanceof Error ? error.message : "Could not read import progress.");
    }
  }

  async function beginImport() {
    onBusyChange(true);
    setJob(null);
    try {
      const started = await requestJson<EventImportJob>("/api/event-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventUrl }),
      });
      setJob(started);
      await pollJob(started.id);
    } catch (error) {
      onBusyChange(false);
      onError(error instanceof Error ? error.message : "Could not start the LinkedIn event import.");
    }
  }

  const importing = job !== null && job.stage !== "complete" && job.stage !== "failed";

  return (
    <section className="panel event-import-panel">
      <div className="event-import-copy">
        <p className="section-label">Audience source</p>
        <h2>Sync LinkedIn event attendees</h2>
        <p>Bring the attendees visible in your organizer view into this campaign queue.</p>
      </div>
      <div className="event-import-form">
        <label htmlFor="event-url">Event URL</label>
        <div className="event-url-row">
          <input
            id="event-url"
            onChange={(event) => setEventUrl(event.target.value)}
            placeholder="https://www.linkedin.com/events/..."
            type="url"
            value={eventUrl}
          />
          <button className="button primary" disabled={disabled || importing || !eventUrl.trim()} onClick={() => void beginImport()} type="button">
            {importing ? "Syncing…" : latestImport?.eventUrl === eventUrl ? "Check for updates" : "Sync attendees"}
          </button>
        </div>
        {job && (
          <div className={`import-progress import-${job.stage}`} aria-live="polite">
            <span className="activity-dot" aria-hidden="true" />
            <div>
              <strong>{job.message}</strong>
              {job.discovered > 0 && job.stage !== "complete" && <small>{job.discovered} unique profiles collected locally so far</small>}
              {job.result && (
                <small>
                  {job.result.newContacts} new · {job.result.duplicates} duplicate{job.result.duplicates === 1 ? "" : "s"} skipped
                  {job.result.previousAttendeeCount > 0 ? ` · previous import ${job.result.previousAttendeeCount}` : ""}
                </small>
              )}
            </div>
          </div>
        )}
        {!job && latestImport && (
          <p className="last-import">
            Last imported {new Date(latestImport.importedAt).toLocaleString()}: {latestImport.attendeeCount} attendees, {latestImport.newContacts} new.
          </p>
        )}
      </div>
    </section>
  );
}
