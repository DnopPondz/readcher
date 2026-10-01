import th from "./th.json";

export type Messages = typeof th;

/** UI strings. Only Thai for now; English is planned for Phase 4. */
export const messages: Messages = th;

/** Replace `{key}` placeholders in a message. */
export function format(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}
