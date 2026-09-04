import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MovementForm } from '@/components/movement-form';
import { ApiError } from '@/lib/api';
import { hasRole, isOperator, requireUser } from '@/lib/auth';
import { date } from '@/lib/format';
import { loadPartStock, movementLabel } from '@/lib/parts';

export default async function PartPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  let detail;
  try {
    detail = await loadPartStock(Number(id));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const { part, holdings, movements, operators } = detail;
  const canManage = hasRole(user, 'department-admin', 'store');
  const canMove = hasRole(user, 'department-admin', 'store', 'supervisor', 'operator');
  const operator = isOperator(user);

  const total = holdings.reduce((sum, h) => sum + Number(h.stock_qty), 0);

  return (
    <>
      <header className="border-b border-ink-12 bg-white px-7 pt-5 pb-4">
        <p className="mb-1.5 text-[13px] text-ink-45">
          <Link href="/parts" className="hover:underline">
            Parts catalogue
          </Link>
          <span className="mx-1.5 text-ink-22">/</span>
          {part.code}
        </p>

        <div className="flex flex-wrap items-end gap-6">
          <div>
            <h1 className="text-[29px] leading-tight font-semibold">{part.name}</h1>
            <p className="mt-1 text-[13.5px] text-ink-45">
              {part.category?.name ?? 'No category'}
              {part.oem_reference ? ` · OEM ${part.oem_reference}` : ''}
              {part.lead_time_days > 0 ? ` · ${part.lead_time_days} day lead time` : ''}
            </p>
          </div>

          <dl className="flex flex-wrap gap-6 pb-1">
            <div>
              <dt className="text-[13px] text-ink-45">
                {operator ? 'We hold' : 'Held across all operators'}
              </dt>
              <dd className="font-cond text-[23px] leading-tight font-semibold">
                {total.toLocaleString('en-IN')}
                <span className="ml-1 font-sans text-[13px] font-medium text-ink-45">
                  {part.uom}
                </span>
              </dd>
            </div>
          </dl>

          {canManage && !operator ? (
            <Link
              href={`/parts/${part.id}/edit`}
              className="ml-auto rounded-md border border-ink-22 bg-white px-4 py-2 text-sm font-medium hover:bg-shoal-soft"
            >
              Edit
            </Link>
          ) : null}
        </div>
      </header>

      <div className="grid gap-5 px-7 py-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
            <div className="border-b border-ink-12 px-5 py-3">
              <h2 className="text-[17px] font-semibold">
                {operator ? 'Our holding' : 'Held by'}
              </h2>
              {!operator ? (
                <p className="text-[13px] text-ink-45">
                  Spares are on the contractor&rsquo;s account, so each operator holds its
                  own.
                </p>
              ) : null}
            </div>

            {holdings.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-ink-45">
                Nobody is holding this part yet.
              </p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-shoal-soft">
                    {['Operator', 'On hand', 'Reorder level', 'Location'].map((h) => (
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
                  {holdings.map((holding) => {
                    const qty = Number(holding.stock_qty);
                    const level = holding.reorder_level !== null ? Number(holding.reorder_level) : null;
                    const short = level !== null && qty <= level;

                    return (
                      <tr key={holding.id} className="border-b border-ink-06 last:border-0">
                        <td className="px-3.5 py-2.5 align-baseline font-medium">
                          {holding.operator?.name ?? '—'}
                        </td>
                        <td className="px-3.5 py-2.5 align-baseline">
                          <span
                            className={`font-cond text-[18px] font-semibold ${
                              short ? 'text-danger' : ''
                            }`}
                          >
                            {qty.toLocaleString('en-IN')}
                          </span>
                          <span className="ml-1 text-[12.5px] text-ink-45">{part.uom}</span>
                          {short ? (
                            <p className="text-[12px] text-danger">At or below reorder level</p>
                          ) : null}
                        </td>
                        <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                          {level !== null ? level.toLocaleString('en-IN') : '—'}
                        </td>
                        <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                          {holding.location?.name ?? '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
            <div className="border-b border-ink-12 px-5 py-3">
              <h2 className="text-[17px] font-semibold">Movements</h2>
              <p className="text-[13px] text-ink-45">
                Every change is an entry, so the balance can always be rebuilt from this.
              </p>
            </div>

            {movements.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-ink-45">
                Nothing has moved yet.
              </p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-shoal-soft">
                    {['Date', 'Movement', 'Quantity', 'Balance', 'Against', 'By'].map((h) => (
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
                  {movements.map((movement) => {
                    const qty = Number(movement.quantity);

                    return (
                      <tr key={movement.id} className="border-b border-ink-06 last:border-0">
                        <td className="px-3.5 py-2.5 align-baseline text-[13px]">
                          {date(movement.transacted_on)}
                        </td>
                        <td className="px-3.5 py-2.5 align-baseline text-[13.5px]">
                          {movementLabel[movement.type] ?? movement.type}
                          {!operator && movement.operator ? (
                            <p className="text-[12px] text-ink-45">{movement.operator.name}</p>
                          ) : null}
                          {movement.remarks ? (
                            <p className="text-[12px] text-ink-45">{movement.remarks}</p>
                          ) : null}
                        </td>
                        <td
                          className={`font-cond px-3.5 py-2.5 align-baseline text-[15px] font-semibold ${
                            qty < 0 ? 'text-danger' : 'text-safe'
                          }`}
                        >
                          {qty > 0 ? '+' : ''}
                          {qty.toLocaleString('en-IN')}
                        </td>
                        <td className="font-cond px-3.5 py-2.5 align-baseline text-[15px] font-semibold">
                          {Number(movement.balance_after).toLocaleString('en-IN')}
                        </td>
                        <td className="px-3.5 py-2.5 align-baseline text-[13px] text-ink-70">
                          {movement.work_order ? (
                            <Link
                              href={`/work-orders/${movement.work_order.id}`}
                              className="hover:underline"
                            >
                              {movement.work_order.number}
                            </Link>
                          ) : (
                            (movement.reference_no ?? '—')
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 align-baseline text-[13px] text-ink-45">
                          {movement.recorded_by?.name ?? '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        </div>

        <aside>
          {canMove ? (
            <section className="sticky top-5 overflow-hidden rounded-lg border border-ink-12 bg-white">
              <div className="border-b border-ink-12 px-4 py-2.5">
                <h2 className="text-[15px] font-semibold">Record a movement</h2>
              </div>
              <div className="px-4 py-3.5">
                <MovementForm
                  partId={part.id}
                  operators={operators}
                  unit={part.uom}
                  ownOperatorId={user.operator_id ?? null}
                />
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}
