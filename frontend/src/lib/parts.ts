import { get } from '@/lib/api';
import type { Movement, OperatorColumn, PartRecord, StockPayload } from '@/lib/part-types';
import type { Paginated } from '@/types/api';

export type {
  Holding,
  Movement,
  OperatorColumn,
  PartRecord,
  StockPayload,
  StockRow,
} from '@/lib/part-types';
export { movementLabel } from '@/lib/part-types';

export const listParts = (query: Record<string, string | number | undefined> = {}) =>
  get<Paginated<PartRecord>>('/parts', { per_page: 200, ...query });

export const loadPart = (id: number) => get<PartRecord>(`/parts/${id}`);

export const loadStock = () => get<StockPayload>('/stock');

export const loadPartStock = (id: number) =>
  get<{
    part: PartRecord;
    holdings: {
      id: number;
      operator_id: number;
      stock_qty: string;
      reorder_level: string | null;
      operator?: OperatorColumn | null;
      location?: { id: number; code: string; name: string } | null;
    }[];
    movements: Movement[];
    operators: OperatorColumn[];
  }>(`/stock/${id}`);
