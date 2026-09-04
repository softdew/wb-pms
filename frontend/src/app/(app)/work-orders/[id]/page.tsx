import Link from 'next/link';
import { IconCode, IconGauge } from '@/components/icons';
import { SectionHeader } from '@/components/section-header';
import { notFound } from 'next/navigation';
import { CloseOutForm } from '@/components/close-out-form';
import { ReadingCapture } from '@/components/reading-capture';
import { WorkOrderActions } from '@/components/work-order-actions';
import { ApiError } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { backlogLabel, date, hours } from '@/lib/format';
import { loadCodeSets, loadWorkOrder, statusLabel, typeLabel } from '@/lib/work-orders';

const statusTone: Record<string, string> = {
  draft: 'text-ink-45',
  released: 'text-shoal-deep',
  in_progress: 'text-caution',
  completed: 'text-safe',
  closed: 'text-ink-45',
  cancelled: 'text-ink-45',
};

export default async function WorkOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  let workOrder;
  try {
    workOrder = await loadWorkOrder(Number(id));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const codes = await loadCodeSets().catch(() => null);
  const editable = ['released', 'in_progress'].includes(workOrder.status);
  const partsIssued = workOrder.parts.some((line) => line.actual_quantity !== null);
  const snapshot = workOrder.task_snapshot as
    | { controlling_reference?: string; acceptance_criteria?: string; permits_required?: string; safety_instructions?: string }
    | null;

  return (
    <>
      <header className="border-b border-ink-12 bg-white shadow-[0_1px_3px_rgba(6,32,44,.05)] px-7 pt-5 pb-4">
        <p className="mb-1.5 text-[13px] text-ink-45">
          <Link href="/work-orders" className="hover:underline">
            Work orders
          </Link>
          <span className="mx-1.5 text-ink-22">/</span>
          {workOrder.number}
        </p>

        <div className="flex flex-wrap items-end gap-6">
          <div>
            <h1 className="text-[29px] leading-tight font-semibold">{workOrder.description}</h1>
            <p className="mt-1 text-[13.5px] text-ink-45">
              {workOrder.equipment?.name}
              {workOrder.equipment?.code ? ` · ${workOrder.equipment.code}` : ''}
              {snapshot?.controlling_reference ? ` · Manual ${snapshot.controlling_reference}` : ''}
            </p>
          </div>

          <dl className="flex flex-wrap gap-6 pb-1">
            <div>
              <dt className="text-[13px] text-ink-45">Status</dt>
              <dd className={`font-medium ${statusTone[workOrder.status] ?? ''}`}>
                {statusLabel[workOrder.status] ?? workOrder.status}
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink-45">Type</dt>
              <dd className="font-medium">{typeLabel[workOrder.type] ?? workOrder.type}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink-45">Due</dt>
              <dd className="font-medium">{date(workOrder.due_on)}</dd>
            </div>
            {workOrder.backlog_state ? (
              <div>
                <dt className="text-[13px] text-ink-45">Backlog</dt>
                <dd className="font-medium">{backlogLabel[workOrder.backlog_state]}</dd>
              </div>
            ) : null}
          </dl>

          <div className="ml-auto pb-0.5">
            <WorkOrderActions
              id={workOrder.id}
              status={workOrder.status}
              hasParts={workOrder.parts.length > 0}
              partsIssued={partsIssued}
            />
          </div>
        </div>
      </header>

      <div className="grid gap-6 px-7 py-7 xl:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {workOrder.readings.length > 0 ? (
            <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
              <SectionHeader
                icon={IconGauge}
                title="Readings"
                hint="Judged against the limits the task carried when this job was raised."
              />
              <table className="w-full">
                <tbody>
                  {workOrder.readings.map((reading) => (
                    <ReadingCapture
                      key={reading.id}
                      workOrderId={workOrder.id}
                      reading={reading}
                      editable={editable}
                    />
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          {workOrder.closeout ? (
            <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
              <SectionHeader
                icon={IconCode}
                tone="safe"
                title="Close-out"
                hint={`Completed ${date(workOrder.closeout.completed_on)}`}
              />
              <dl className="grid gap-4 px-4.5 py-4 sm:grid-cols-2">
                {[
                  ['Failure mode', workOrder.closeout.failure_mode],
                  ['Apparent cause', workOrder.closeout.cause],
                  ['How it was found', workOrder.closeout.detection_method],
                  ['Severity', workOrder.closeout.severity],
                ].map(([label, code]) => (
                  <div key={String(label)}>
                    <dt className="text-[13px] text-ink-45">{label as string}</dt>
                    <dd className="font-medium">
                      {code ? (
                        <>
                          {(code as { code: string }).code}
                          <span className="ml-1.5 font-normal text-ink-70">
                            {(code as { description: string }).description}
                          </span>
                        </>
                      ) : (
                        '—'
                      )}
                    </dd>
                  </div>
                ))}
                <div>
                  <dt className="text-[13px] text-ink-45">Downtime</dt>
                  <dd className="font-medium">
                    {hours(workOrder.closeout.planned_downtime_hours)} planned ·{' '}
                    {hours(workOrder.closeout.unplanned_downtime_hours)} unplanned
                  </dd>
                </div>
                <div>
                  <dt className="text-[13px] text-ink-45">Acceptance criteria</dt>
                  <dd className={`font-medium ${workOrder.closeout.acceptance_criteria_met ? 'text-safe' : 'text-danger'}`}>
                    {workOrder.closeout.acceptance_criteria_met ? 'Met' : 'Not met'}
                  </dd>
                </div>
                {workOrder.closeout.observations ? (
                  <div className="sm:col-span-2">
                    <dt className="text-[13px] text-ink-45">Observations</dt>
                    <dd>{workOrder.closeout.observations}</dd>
                  </div>
                ) : null}
              </dl>
            </section>
          ) : editable && codes ? (
            <CloseOutForm workOrder={workOrder} codes={codes} />
          ) : null}
        </div>

        <aside className="space-y-5">
          {workOrder.parts.length > 0 ? (
            <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
              <div className="border-b border-ink-12 px-4 py-2.5">
                <h2 className="text-[15px] font-semibold">Spares</h2>
              </div>
              <ul className="divide-y divide-ink-06">
                {workOrder.parts.map((line) => (
                  <li key={line.id} className="px-4 py-2.5">
                    <p className="text-[13.5px] font-medium">{line.part?.name}</p>
                    <p className="text-[12.5px] text-ink-45">
                      {line.part?.code} · planned {line.planned_quantity}
                      {line.actual_quantity !== null ? ` · issued ${line.actual_quantity}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {workOrder.labour.length > 0 ? (
            <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
              <div className="border-b border-ink-12 px-4 py-2.5">
                <h2 className="text-[15px] font-semibold">Labour</h2>
              </div>
              <ul className="divide-y divide-ink-06">
                {workOrder.labour.map((line) => (
                  <li key={line.id} className="px-4 py-2.5">
                    <p className="text-[13.5px] font-medium">{line.trade?.name ?? 'Unassigned trade'}</p>
                    <p className="text-[12.5px] text-ink-45">
                      {hours(line.standard_hours)} hrs standard
                      {line.actual_hours ? ` · ${hours(line.actual_hours)} actual` : ''} ·{' '}
                      {line.persons} {line.persons === 1 ? 'person' : 'people'}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {snapshot?.acceptance_criteria || snapshot?.permits_required || snapshot?.safety_instructions ? (
            <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
              <div className="border-b border-ink-12 px-4 py-2.5">
                <h2 className="text-[15px] font-semibold">As raised</h2>
                <p className="text-[12px] text-ink-45">
                  The task as it stood when this job was raised.
                </p>
              </div>
              <dl className="space-y-3 px-4 py-3">
                {snapshot.permits_required ? (
                  <div>
                    <dt className="text-[12.5px] text-ink-45">Permits</dt>
                    <dd className="text-[13.5px]">{snapshot.permits_required}</dd>
                  </div>
                ) : null}
                {snapshot.safety_instructions ? (
                  <div>
                    <dt className="text-[12.5px] text-ink-45">Safety</dt>
                    <dd className="text-[13.5px]">{snapshot.safety_instructions}</dd>
                  </div>
                ) : null}
                {snapshot.acceptance_criteria ? (
                  <div>
                    <dt className="text-[12.5px] text-ink-45">Acceptance criteria</dt>
                    <dd className="text-[13.5px]">{snapshot.acceptance_criteria}</dd>
                  </div>
                ) : null}
              </dl>
            </section>
          ) : null}

          <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
            <div className="border-b border-ink-12 px-4 py-2.5">
              <h2 className="text-[15px] font-semibold">Progress</h2>
            </div>
            <ol className="space-y-2.5 px-4 py-3">
              {[
                ['Raised', workOrder.due_on],
                ['Released', workOrder.released_on],
                ['Started', workOrder.started_on],
                ['Completed', workOrder.completed_on],
              ].map(([label, when]) => (
                <li key={String(label)} className="flex items-baseline gap-2.5">
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${when ? 'bg-safe' : 'bg-ink-22'}`}
                    aria-hidden
                  />
                  <span className="text-[13.5px]">{label as string}</span>
                  <span className="ml-auto text-[12.5px] text-ink-45">
                    {when ? date(when as string) : '—'}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </>
  );
}
