import { get } from '@/lib/api';
import type { ChecklistTask, LibraryPreview } from '@/lib/task-types';
import type { Paginated } from '@/types/api';

export type {
  ChecklistTask,
  IntervalUnit,
  LibraryPreview,
  LibraryPreviewTask,
  PartLineType,
  TaskPart,
  TaskReading,
  TriggerClass,
} from '@/lib/task-types';
export {
  intervalUnitLabel,
  partLineTypeLabel,
  triggerClassHint,
  triggerClassLabel,
} from '@/lib/task-types';

export const listTasks = (query: Record<string, string | number | undefined> = {}) =>
  get<Paginated<ChecklistTask>>('/checklist-tasks', { per_page: 200, ...query });

export const loadTask = (id: number) =>
  get<{ task: ChecklistTask; applied_to: unknown[] }>(`/checklist-tasks/${id}`);

export const loadLibraryPreview = (equipmentId: number) =>
  get<LibraryPreview>(`/equipment/${equipmentId}/library-preview`);
