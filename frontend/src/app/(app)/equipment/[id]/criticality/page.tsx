import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ScoreForm } from '@/components/score-form';
import { ApiError, get } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { date } from '@/lib/format';
import { loadHistory, loadScales, triggerLabel } from '@/lib/criticality';
import type { Equipment } from '@/types/api';

const bandStyle: Record<string, string> = {
  high: 'text-danger',
  medium: 'text-caution',
  low: 'text-safe',
};

export default async function ScoreCriticalityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  let equipment;
  try {
    equipment = await get<Equipment & { vessel?: { id: number; name: string } | null }>(
      `/equipment/${id}`,
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const [scales, history] = await Promise.all([
    loadScales(),
    loadHistory(Number(id)).catch(() => null),
  ]);

  const previous = history?.data.filter((a) => a.status === 'approved') ?? [];

  return (
    <>
      <header className="border-b border-ink-12 bg-white shadow-[0_1px_3px_rgba(6,32,44,.05)] px-7 pt-5 pb-4">
        <p className="mb-1.5 text-[13px] text-ink-45">
          <Link href="/criticality" className="hover:underline">
            Criticality
          </Link>
          <span className="mx-1.5 text-ink-22">/</span>
          {equipment.code}
        </p>

        <div className="flex flex-wrap items-end gap-6">
          <div>
            <h1 className="text-[29px] leading-tight font-semibold">{equipment.name}</h1>
            <p className="mt-1 text-[13.5px] text-ink-45">
              {equipment.vessel?.name ?? 'Shore equipment'}
              {equipment.serial_no ? ` · ${equipment.serial_no}` : ''}
            </p>
          </div>

          {equipment.criticality_band ? (
            <div className="pb-1">
              <p className="text-[13px] text-ink-45">Current band</p>
              <p className={`font-medium capitalize ${bandStyle[equipment.criticality_band]}`}>
                {equipment.criticality_band} · index {equipment.criticality_index}
              </p>
            </div>
          ) : null}
        </div>
      </header>

      <div className="space-y-6 px-7 py-7">
        {equipment.hidden_failure_flag ? (
          <p className="rounded-md border border-caution/30 bg-caution-soft px-4 py-3 text-[13.5px] text-caution">
            This item carries a hidden failure mode — its failure would not be evident in
            normal operation. It cannot be run to failure whatever the band, and its
            interval cannot be extended.
          </p>
        ) : null}

        <ScoreForm
          equipmentId={equipment.id}
          equipmentName={equipment.name}
          scales={scales}
          isReassessment={previous.length > 0}
        />

        {previous.length > 0 ? (
          <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
            <div className="border-b border-ink-12 px-5 py-3">
              <h2 className="font-cond text-[19px] font-semibold text-shoal-ink">
                Previous assessments
              </h2>
              <p className="text-[13px] text-ink-45">
                Each holds the thresholds it was judged under, so recalibrating the scales
                does not rewrite past decisions.
              </p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-shoal-soft">
                  {['Approved', 'Score', 'Index', 'Band', 'Raised because', 'Approved by'].map((h) => (
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
                {previous.map((assessment) => (
                  <tr key={assessment.id} className="border-b border-ink-06 last:border-0">
                    <td className="px-3.5 py-2.5 align-baseline text-[13.5px]">
                      {date(assessment.approved_at)}
                    </td>
                    <td className="font-cond px-3.5 py-2.5 align-baseline text-[14px]">
                      {assessment.consequence_c} × {assessment.exposure_e} ×{' '}
                      {assessment.redundancy_r}
                    </td>
                    <td className="font-cond px-3.5 py-2.5 align-baseline text-[16px] font-semibold">
                      {assessment.criticality_index}
                    </td>
                    <td
                      className={`px-3.5 py-2.5 align-baseline text-[13.5px] font-medium capitalize ${
                        bandStyle[assessment.band]
                      }`}
                    >
                      {assessment.band}
                    </td>
                    <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                      {assessment.review_trigger
                        ? (triggerLabel[assessment.review_trigger] ?? assessment.review_trigger)
                        : '—'}
                    </td>
                    <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                      {assessment.approver?.name ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}
      </div>
    </>
  );
}
