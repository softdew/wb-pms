import { get } from '@/lib/api';
import type { Operator, OperatorDetail } from '@/lib/operator-types';
import type { Paginated } from '@/types/api';

export type {
  Operator,
  OperatorDetail,
  OperatorIncharge,
  OperatorType,
  OperatorUser,
} from '@/lib/operator-types';
export { operatorTypeLabel } from '@/lib/operator-types';

export const listOperators = (query: Record<string, string | number | undefined> = {}) =>
  get<Paginated<Operator>>('/operators', { per_page: 100, ...query });

export const loadOperator = (id: number) => get<OperatorDetail>(`/operators/${id}`);
