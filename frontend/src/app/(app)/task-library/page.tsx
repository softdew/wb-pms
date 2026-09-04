import Link from 'next/link';
import { IconLibrary } from '@/components/icons';
import { SectionHeader } from '@/components/section-header';
import { hasRole, requireUser } from '@/lib/auth';
import { listTasks, triggerClassLabel } from '@/lib/tasks';
import type { ChecklistTask } from '@/lib/task-types';

export default async function TaskLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; equipment_category_id?: string }>;
}) {
  const user = await requireUser();
  const { search, equipment_category_id } = await searchParams;

  const tasks = await listTasks({
    search,
    equipment_category_id: equipment_category_id ? Number(equipment_category_id) : undefined,
  });

  const canManage = hasRole(user, 'department-admin', 'planner', 'technical-authority');

  // Tasks used on one asset or none are the ones that make a library
  // unmaintainable, so they are worth surfacing rather than counting.
  const singleUse = tasks.data.filter((task) => (task.applied_count ?? 0) <= 1).length;

  const grouped = tasks.data.reduce<Record<string, ChecklistTask[]>>((acc, task) => {
    const key = task.category?.name ?? 'No category';
    acc[key] = [...(acc[key] ?? []), task];

    return acc;
  }, {});

  return (
    <>
      <header className="border-b border-ink-12 bg-white shadow-[0_1px_3px_rgba(6,32,44,.05)] px-7 pt-5 pb-4">
        <p className="text-[13px] text-ink-45">Fleet</p>
        <div className="flex flex-wrap items-end gap-6">
          <h1 className="text-[29px] leading-tight font-semibold">Task library</h1>
          <p className="pb-1.5 text-[13px] text-ink-45">
            {tasks.total} tasks
            {singleUse > 0 ? (
              <span className="text-caution"> · {singleUse} applied to one asset or none</span>
            ) : null}
          </p>

          {canManage ? (
            <Link
              href="/task-library/new"
              className="ml-auto rounded-md bg-ink px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0C3040]"
            >
              Add a task
            </Link>
          ) : null}
        </div>
      </header>

      <div className="space-y-6 px-7 py-7">
        <form className="flex flex-wrap items-center gap-2">
          <input
            name="search"
            defaultValue={search}
            placeholder="Search description, code or reference"
            aria-label="Search the library"
            className="w-72 rounded-md border border-ink-22 bg-white px-3 py-1.5 text-sm outline-none focus:border-ink-45"
          />
        </form>

        {tasks.data.length === 0 ? (
          <section className="rounded-lg border border-ink-12 bg-white px-6 py-12 text-center">
            <p className="font-cond text-lg font-semibold">
              {search ? 'Nothing matches that search.' : 'The library is empty.'}
            </p>
            <p className="mt-1 text-sm text-ink-45">
              {search
                ? 'Try a shorter search term.'
                : 'Write a task once, then apply it to every asset of that category.'}
            </p>
            {!search && canManage ? (
              <Link
                href="/task-library/new"
                className="mt-4 inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-[#0C3040]"
              >
                Write the first task
              </Link>
            ) : null}
          </section>
        ) : (
          Object.entries(grouped).map(([category, list]) => (
            <section key={category} className="overflow-hidden rounded-lg border border-ink-12 bg-white">
              <SectionHeader
                icon={IconLibrary}
                title={category}
                hint={`${list.length} ${list.length === 1 ? 'task' : 'tasks'}`}
              />

              <table className="w-full">
                <thead>
                  <tr className="bg-shoal-soft">
                    {['Task', 'Trigger', 'Interval', 'Standard hours', 'Applied to'].map((h) => (
                      <th
                        key={h}
                        className="border-b border-ink-12 px-3.5 py-2.5 text-left text-[12.5px] font-semibold text-ink-45"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.map((task) => (
                    <tr key={task.id} className="border-b border-ink-06 last:border-0 hover:bg-shoal-soft">
                      <td className="px-3.5 py-2.5 align-baseline">
                        <Link href={`/task-library/${task.id}`} className="font-medium hover:underline">
                          {task.activity_description}
                        </Link>
                        <p className="text-[12.5px] text-ink-45">
                          {task.code}
                          {task.controlling_reference ? ` · Manual ${task.controlling_reference}` : ''}
                          {task.section ? ` · ${task.section}` : ''}
                        </p>
                      </td>
                      <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                        {triggerClassLabel[task.default_trigger_class]}
                      </td>
                      <td className="font-cond px-3.5 py-2.5 align-baseline text-[15px] font-semibold">
                        {task.default_interval_value
                          ? `${Number(task.default_interval_value)} ${
                              task.default_interval_unit === 'hours' ? 'hrs' : task.default_interval_unit
                            }`
                          : '—'}
                        {task.first_interval_value ? (
                          <span className="ml-1.5 font-sans text-[12px] font-normal text-ink-45">
                            first at {Number(task.first_interval_value)}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                        {task.estimated_hours ? `${Number(task.estimated_hours)} hrs` : '—'}
                      </td>
                      <td className="px-3.5 py-2.5 align-baseline">
                        <span
                          className={`font-cond text-[16px] font-semibold ${
                            (task.applied_count ?? 0) === 0 ? 'text-caution' : ''
                          }`}
                        >
                          {task.applied_count ?? 0}
                        </span>
                        <span className="ml-1 text-[12.5px] text-ink-45">
                          {(task.applied_count ?? 0) === 1 ? 'asset' : 'assets'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))
        )}
      </div>
    </>
  );
}
