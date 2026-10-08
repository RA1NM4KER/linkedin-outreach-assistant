import type { Contact } from "@/types";

export type TemplateContact = Pick<Contact, "firstName" | "fullName">;

export function interpolateTemplate(template: string, contact: TemplateContact): string {
  return template
    .replaceAll("{firstName}", contact.firstName)
    .replaceAll("{fullName}", contact.fullName);
}
