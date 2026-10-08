import "server-only";
import { randomUUID } from "node:crypto";
import { importEventAttendees } from "@/lib/linkedin/eventAttendees";
import { normalizeLinkedInEventUrl } from "@/lib/linkedin/eventUrl";
import { importLinkedInAttendees } from "@/lib/storage/store";
import type { EventImportJob, EventImportStage } from "@/types";

declare global {
  var linkedInEventImportJobs: Map<string, EventImportJob> | undefined;
}

const jobs = globalThis.linkedInEventImportJobs ?? new Map<string, EventImportJob>();
globalThis.linkedInEventImportJobs = jobs;

function updateJob(id: string, update: Partial<EventImportJob>): void {
  const job = jobs.get(id);
  if (!job) return;
  jobs.set(id, { ...job, ...update, updatedAt: new Date().toISOString() });
}

async function runJob(id: string): Promise<void> {
  const job = jobs.get(id);
  if (!job) return;
  const progress = (stage: EventImportStage, message: string, discovered: number) => updateJob(id, { stage, message, discovered });
  try {
    const attendees = await importEventAttendees(job.eventUrl, progress);
    progress("saving", `Saving ${attendees.length} unique attendees…`, attendees.length);
    const result = await importLinkedInAttendees(job.eventUrl, attendees);
    updateJob(id, {
      stage: "complete",
      message: `Import complete: ${result.attendeeCount} unique attendees.`,
      discovered: result.attendeeCount,
      result,
      finishedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "LinkedIn event import failed.";
    updateJob(id, { stage: "failed", message, error: message, finishedAt: new Date().toISOString() });
  }
}

export function startEventImport(value: string): EventImportJob {
  const eventUrl = normalizeLinkedInEventUrl(value);
  const running = [...jobs.values()].find((job) => !job.finishedAt);
  if (running) throw new Error("An attendee import is already running.");

  const now = new Date().toISOString();
  const job: EventImportJob = {
    id: randomUUID(),
    eventUrl,
    stage: "queued",
    message: "Preparing import…",
    discovered: 0,
    startedAt: now,
    updatedAt: now,
  };
  jobs.set(job.id, job);
  void runJob(job.id);

  if (jobs.size > 20) {
    const completed = [...jobs.values()].filter((item) => item.finishedAt).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
    for (const oldJob of completed.slice(0, jobs.size - 20)) jobs.delete(oldJob.id);
  }
  return job;
}

export function getEventImportJob(id: string): EventImportJob | null {
  return jobs.get(id) ?? null;
}
