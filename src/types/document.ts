/** Optional document capabilities. Plain HTML v-model remains supported. */
export type EditorLocale = "en" | "pt-PT" | (string & {});
export type DocumentRole = "author" | "reviewer" | "viewer";
export interface DocumentDiagnostic {
  event: string;
  timestamp: string;
  operationId: string;
  documentId?: string;
  detail?: Record<string, string | number | boolean>;
}
export type DiagnosticSink = (event: DocumentDiagnostic) => void;
export interface PageSettings {
  size: "A4" | "Letter";
  orientation: "portrait" | "landscape";
  margin: number;
  header: string;
  footer: string;
  numbering: boolean;
  title: string;
  language: string;
}
export interface CitationSource {
  id: string;
  author: string;
  title: string;
  year: string;
  publisher?: string;
  url?: string;
  type?: "book" | "webpage";
  locator?: string;
}
export interface CitationFormatter {
  format(
    sources: CitationSource[],
    language: string,
  ): {
    citation: (id: string, locator?: string) => string;
    bibliography: { id: string; html: string }[];
  };
}
export interface DocumentNote {
  id: string;
  text: string;
}
export interface ReviewSuggestion {
  id: string;
  blockId: string;
  author: string;
  createdAt: string;
  before: string;
  after: string;
  status: "pending" | "accepted" | "rejected" | "orphaned";
}
export type TemplateValue =
  | string
  | number
  | boolean
  | null
  | TemplateValue[]
  | { [key: string]: TemplateValue };
export interface TemplateField {
  name: string;
  type: "string" | "number" | "date" | "boolean" | "list";
  required?: boolean;
  default?: TemplateValue;
  format?: "plain" | "integer" | "percent" | "date-long";
}
export interface TemplateDataset {
  name: string;
  values: Record<string, TemplateValue>;
}
export interface DocumentMetadata {
  schemaVersion: 1;
  page: PageSettings;
  comments: string;
  sources: CitationSource[];
  notes: DocumentNote[];
  citationStyle: "apa" | "numbered";
  suggestions: ReviewSuggestion[];
  templateFields: TemplateField[];
  templateDatasets?: TemplateDataset[];
}
export interface DocumentSnapshot {
  html: string;
  metadata: DocumentMetadata;
}
export interface DocumentVersion extends DocumentSnapshot {
  id: string;
  documentId: string;
  revision: number;
  label: string;
  createdAt: string;
}
export interface VersionStore {
  /** A remote adapter must authorize reads for the authenticated caller. */
  list(documentId: string): Promise<DocumentVersion[]>;
  /** Authorize and compare expectedRevision atomically with the persisted write. Reject stale revisions. */
  create(
    documentId: string,
    value: DocumentSnapshot,
    label: string,
    expectedRevision: number,
  ): Promise<DocumentVersion>;
  deleteDocument(documentId: string): Promise<void>;
}
export interface AiRequest {
  documentId: string;
  action: "clarify" | "shorten" | "tone" | "translate";
  selection: string;
  context?: string;
  instruction?: string;
  language: string;
  signal: AbortSignal;
}
export interface AiResponse {
  html: string;
  usage?: { inputTokens?: number; outputTokens?: number; cost?: number };
}
export interface AiAdapter {
  name: string;
  generate(
    request: AiRequest,
    onPreview: (text: string) => void,
  ): Promise<AiResponse>;
}
export interface DocumentOptions {
  id: string;
  store?: VersionStore;
  metadata?: DocumentMetadata;
  /** Browser interaction policy. Remote storage must enforce authorization independently. */
  role?: DocumentRole;
  author?: string;
  ai?: AiAdapter;
  citationFormatter?: CitationFormatter;
  onDiagnostic?: DiagnosticSink;
  /** Local crash recovery is opt-in and document scoped. */
  localRecovery?: boolean;
  autoCheckpointMs?: number;
}
export const defaultPageSettings = (): PageSettings => ({
  size: "A4",
  orientation: "portrait",
  margin: 40,
  header: "",
  footer: "",
  numbering: true,
  title: "Document",
  language: "en",
});
export const defaultDocumentMetadata = (): DocumentMetadata => ({
  schemaVersion: 1,
  page: defaultPageSettings(),
  comments: "[]",
  sources: [],
  notes: [],
  citationStyle: "apa",
  suggestions: [],
  templateFields: [],
  templateDatasets: [],
});
