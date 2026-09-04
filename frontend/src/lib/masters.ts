import { get } from '@/lib/api';
import type { MasterConfig, MasterRow } from '@/lib/master-types';
import type { Paginated } from '@/types/api';

export type { MasterColumn, MasterConfig, MasterField, MasterRow } from '@/lib/master-types';

/**
 * The master tables, described once.
 *
 * Seven screens of the same shape. Writing seven near-identical pages would
 * mean seven places to fix a bug, so the differences live here as data and one
 * component renders them.
 *
 * Each carries a purpose line, because a code-and-name form tells you nothing
 * about why the record matters or what breaks without it.
 */
export const masters: Record<string, MasterConfig> = {
  'ship-types': {
    slug: 'ship-types',
    endpoint: '/ship-types',
    title: 'Ship types',
    singular: 'ship type',
    purpose:
      'The classes of vessel in the fleet. Every vessel carries one, and it is what fleet reporting groups by.',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'code', label: 'Code', muted: true },
      { key: 'category', label: 'Category' },
      { key: 'capacity_particulars', label: 'Capacity' },
      { key: 'operating_zone', label: 'Zone' },
    ],
    fields: [
      { name: 'code', label: 'Code', required: true, placeholder: 'FERRY' },
      { name: 'name', label: 'Name', required: true, placeholder: 'Passenger Ferry' },
      { name: 'category', label: 'Category', placeholder: 'Ferry, tug, barge, patrol craft' },
      { name: 'capacity_particulars', label: 'Capacity', placeholder: '150 passengers' },
      {
        name: 'operating_zone',
        label: 'Operating zone',
        type: 'select',
        options: [
          { value: '', label: 'Not set' },
          { value: 'river', label: 'River' },
          { value: 'coastal', label: 'Coastal' },
          { value: 'offshore', label: 'Offshore' },
        ],
      },
      { name: 'remarks', label: 'Remarks', type: 'textarea', full: true },
      { name: 'is_active', label: 'In use', type: 'checkbox', full: true },
    ],
  },

  locations: {
    slug: 'locations',
    endpoint: '/locations',
    title: 'Locations',
    singular: 'location',
    purpose:
      'Ghats, terminals, workshops and stores. Equipment ashore is registered against one of these and stays with the department — operators do not see it.',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'code', label: 'Code', muted: true },
      { key: 'type', label: 'Type' },
      { key: 'address', label: 'Address', muted: true },
    ],
    fields: [
      { name: 'code', label: 'Code', required: true, placeholder: 'GHAT1' },
      { name: 'name', label: 'Name', required: true, placeholder: 'Howrah Ghat' },
      {
        name: 'type',
        label: 'Type',
        type: 'select',
        required: true,
        options: [
          { value: 'ghat', label: 'Ghat' },
          { value: 'terminal', label: 'Terminal' },
          { value: 'workshop', label: 'Workshop' },
          { value: 'store', label: 'Store' },
          { value: 'office', label: 'Office' },
        ],
      },
      {
        name: 'is_store',
        label: 'Stock can be held here',
        type: 'checkbox',
        hint: 'Storage locations appear when recording where a spare sits.',
      },
      { name: 'address', label: 'Address', type: 'textarea', full: true },
      { name: 'is_active', label: 'In use', type: 'checkbox', full: true },
    ],
  },

  'equipment-categories': {
    slug: 'equipment-categories',
    endpoint: '/equipment-categories',
    title: 'Equipment categories',
    singular: 'category',
    purpose:
      'Main engine, generator, pumps. A category decides which library tasks can be applied to an item, so an item with none can never be planned in bulk.',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'code', label: 'Code', muted: true },
      { key: 'description', label: 'Description', muted: true },
    ],
    fields: [
      { name: 'code', label: 'Code', required: true, placeholder: 'ME' },
      { name: 'name', label: 'Name', required: true, placeholder: 'Main Engine' },
      { name: 'description', label: 'Description', type: 'textarea', full: true },
      { name: 'is_active', label: 'In use', type: 'checkbox', full: true },
    ],
  },

  'equipment-models': {
    slug: 'equipment-models',
    endpoint: '/equipment-models',
    title: 'Makes and models',
    singular: 'model',
    purpose:
      'The machinery library, populated from the asset records and OEM documentation supplied. Used to identify what an item actually is.',
    columns: [
      { key: 'make', label: 'Make' },
      { key: 'model', label: 'Model' },
      { key: 'oem', label: 'OEM', muted: true },
      { key: 'notes', label: 'Notes', muted: true },
    ],
    fields: [
      { name: 'make', label: 'Make', required: true, placeholder: 'Kirloskar' },
      { name: 'model', label: 'Model', required: true, placeholder: 'R1040' },
      { name: 'oem', label: 'OEM', placeholder: 'Kirloskar Oil Engines Ltd' },
      {
        name: 'equipment_category_id',
        label: 'Category',
        type: 'select',
        hint: 'Narrows the list when picking a model for an item.',
      },
      { name: 'notes', label: 'Notes', type: 'textarea', full: true },
      { name: 'is_active', label: 'In use', type: 'checkbox', full: true },
    ],
    lookups: { equipment_category_id: { endpoint: '/equipment-categories' } },
  },

  'part-categories': {
    slug: 'part-categories',
    endpoint: '/part-categories',
    title: 'Part categories',
    singular: 'part category',
    purpose: 'How the parts catalogue is grouped for searching and reporting.',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'code', label: 'Code', muted: true },
    ],
    fields: [
      { name: 'code', label: 'Code', required: true, placeholder: 'ENG' },
      { name: 'name', label: 'Name', required: true, placeholder: 'Engine spares' },
      { name: 'is_active', label: 'In use', type: 'checkbox', full: true },
    ],
  },

  trades: {
    slug: 'trades',
    endpoint: '/trades',
    title: 'Trades',
    singular: 'trade',
    purpose:
      'Fitter, electrician, welder. A task names the trade that does it, and standard hours are loaded against that trade when the schedule is planned.',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'code', label: 'Code', muted: true },
    ],
    fields: [
      { name: 'code', label: 'Code', required: true, placeholder: 'ENGR' },
      { name: 'name', label: 'Name', required: true, placeholder: 'Marine Engineer' },
      { name: 'is_active', label: 'In use', type: 'checkbox', full: true },
    ],
  },

  vendors: {
    slug: 'vendors',
    endpoint: '/vendors',
    title: 'Vendors',
    singular: 'vendor',
    purpose:
      'Empanelled contractors and suppliers. A work order sent outside names one of these, and its cost is captured against it.',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'code', label: 'Code', muted: true },
      { key: 'category', label: 'Category' },
      { key: 'contract_no', label: 'Contract' },
      { key: 'status', label: 'Status' },
    ],
    fields: [
      { name: 'code', label: 'Code', required: true, placeholder: 'V001' },
      { name: 'name', label: 'Name', required: true },
      { name: 'category', label: 'Category', placeholder: 'Engine overhaul, dry dock, electrical' },
      { name: 'contract_no', label: 'Contract number' },
      { name: 'contract_valid_from', label: 'Contract from', type: 'date' },
      { name: 'contract_valid_to', label: 'Contract to', type: 'date' },
      { name: 'contact_name', label: 'Contact person' },
      { name: 'contact_phone', label: 'Phone', type: 'tel' },
      { name: 'contact_email', label: 'Email', type: 'email' },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'empanelled', label: 'Empanelled' },
          { value: 'suspended', label: 'Suspended' },
          { value: 'expired', label: 'Expired' },
        ],
      },
      { name: 'address', label: 'Address', type: 'textarea', full: true },
    ],
    lookups: {},
  },
};

export function masterFor(slug: string): MasterConfig | undefined {
  return masters[slug];
}

export async function loadMasterRows(config: MasterConfig, search?: string) {
  return get<Paginated<MasterRow>>(config.endpoint, { per_page: 200, search });
}

/** Options for any select field that pulls from another table. */
export async function loadMasterLookups(
  config: MasterConfig,
): Promise<Record<string, { value: string; label: string }[]>> {
  if (!config.lookups) return {};

  const entries = await Promise.all(
    Object.entries(config.lookups).map(async ([field, lookup]) => {
      try {
        const page = await get<Paginated<MasterRow>>(lookup.endpoint, { per_page: 200 });
        const key = lookup.labelKey ?? 'name';

        return [
          field,
          [
            { value: '', label: 'Not set' },
            ...page.data.map((row) => ({
              value: String(row.id),
              label: String(row[key] ?? row.id),
            })),
          ],
        ] as const;
      } catch {
        return [field, [{ value: '', label: 'Not set' }]] as const;
      }
    }),
  );

  return Object.fromEntries(entries);
}
