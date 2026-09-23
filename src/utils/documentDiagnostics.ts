import type { DiagnosticSink } from "../types/document";
let counter = 0;
export function operationId(): string {
  counter += 1;
  return (
    "nle-" +
    Date.now().toString(36) +
    "-" +
    counter.toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 9)
  );
}
export function diagnostic(
  sink: DiagnosticSink | undefined,
  event: string,
  documentId?: string,
  detail?: Record<string, string | number | boolean>,
): void {
  const record = {
    event,
    documentId,
    detail,
    operationId: operationId(),
    timestamp: new Date().toISOString(),
  };
  // Sinks cannot make an editing operation fail. Only bounded, non-content metadata is accepted.
  try {
    if (sink) sink(record);
    else console.debug("[NextLevelEditor]", record);
  } catch {
    console.warn("[NextLevelEditor] Diagnostic sink failed");
  }
}
export const cloneDocument = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;
export function fingerprint(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++)
    hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(36);
}
