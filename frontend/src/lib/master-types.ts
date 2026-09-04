/** Shapes with no server imports, safe for client components. */

export type FieldType = 'text' | 'number' | 'date' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox';

export interface MasterField {
  name: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  /** For select fields. */
  options?: { value: string; label: string }[];
  /** Half width on wide screens, which most fields are. */
  full?: boolean;
}

export interface MasterColumn {
  key: string;
  label: string;
  /** Renders the value; falls back to the raw field. */
  render?: (row: Record<string, unknown>) => string;
  muted?: boolean;
}

export interface MasterConfig {
  /** URL segment under /setup and the API path. */
  slug: string;
  endpoint: string;
  title: string;
  singular: string;
  /** One line saying what this master is for and what depends on it. */
  purpose: string;
  columns: MasterColumn[];
  fields: MasterField[];
  /** Extra options loaded from other endpoints, keyed by field name. */
  lookups?: Record<string, { endpoint: string; labelKey?: string }>;
}

export type MasterRow = Record<string, unknown> & { id: number };
