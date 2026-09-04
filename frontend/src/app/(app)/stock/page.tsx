import Link from 'next/link';
import { IconStock } from '@/components/icons';
import { SectionHeader } from '@/components/section-header';
import { isOperator, requireUser } from '@/lib/auth';
import { loadStock } from '@/lib/parts';

export default async function StockPage() {
  const user = await requireUser();
  const stock = await loadStock().catch(() => null);

  const operator = isOperator(user);

  if (!stock) {
    return (
      <>
        <header className="border-b border-ink-12 bg-white shadow-[0_1px_3px_rgba(6,32,44,.05)] px-7 pt-5 pb-4">
          <p className="text-[13px] text-ink-45">Stores</p>
          <h1 className="text-[29px] leading-tight font-semibold">Stock</h1>
        </header>
        <div className="px-7 py-7">
          <p className="rounded-lg border border-ink-12 bg-white px-6 py-10 text-center text-sm text-ink-45">
            Stock is unavailable for this account.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="border-b border-ink-12 bg-white shadow-[0_1px_3px_rgba(6,32,44,.05)] px-7 pt-5 pb-4">
        <p className="text-[13px] text-ink-45">Stores</p>
        <div className="flex flex-wrap items-end gap-6">
          <h1 className="text-[29px] leading-tight font-semibold">
            {operator ? 'Our stock' : 'Stock by operator'}
          </h1>
          <p className="pb-1.5 text-[13px] text-ink-45">
            {stock.totals.lines} {stock.totals.lines === 1 ? 'holding' : 'holdings'}
            {stock.totals.below_reorder > 0 ? (
              <span className="text-danger">
                {' '}
                · {stock.totals.below_reorder} at or below reorder level
              </span>
            ) : null}
          </p>
        </div>

        {!operator ? (
          <p className="mt-1 text-[13.5px] text-ink-45">
            Spares are on the contractor&rsquo;s account. One catalogue, held separately by
            each operating company.
          </p>
        ) : null}
      </header>

      <div className="px-7 py-7">
        <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
          <SectionHeader
            icon={IconStock}
            title="On hand"
            hint={
              operator
                ? 'What we are holding.'
                : 'One row per part, one column per operating company.'
            }
          />

          {stock.rows.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="font-cond text-lg font-semibold">Nothing in stock yet.</p>
              <p className="mt-1 text-sm text-ink-45">
                Open a part from the catalogue and record a receipt against an operator.
              </p>
              <Link
                href="/parts"
                className="mt-4 inline-block rounded-md border border-ink-22 px-4 py-2 text-sm font-medium hover:bg-shoal-soft"
              >
                Open the catalogue
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-shoal-soft">
                    <th className="border-b border-ink-12 px-3.5 py-2.5 text-left text-[12.5px] font-semibold text-ink-45">
                      Part
                    </th>
                    {stock.operators.map((op) => (
                      <th
                        key={op.id}
                        className="border-b border-ink-12 px-3.5 py-2.5 text-right text-[12.5px] font-semibold text-ink-45"
                      >
                        {op.name}
                      </th>
                    ))}
                    {!operator && stock.operators.length > 1 ? (
                      <th className="border-b border-ink-12 px-3.5 py-2.5 text-right text-[12.5px] font-semibold text-ink-45">
                        Total
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {stock.rows.map((row) => (
                    <tr
                      key={row.part.id}
                      className="border-b border-ink-06 last:border-0 hover:bg-shoal-soft"
                    >
                      <td className="px-3.5 py-2.5 align-baseline">
                        <Link href={`/parts/${row.part.id}`} className="font-medium hover:underline">
                          {row.part.name}
                        </Link>
                        <p className="text-[12.5px] text-ink-45">
                          {row.part.code}
                          {row.part.lead_time_days > 0
                            ? ` · ${row.part.lead_time_days} day lead time`
                            : ''}
                        </p>
                      </td>

                      {stock.operators.map((op) => {
                        const holding = row.holdings.find((h) => h.operator_id === op.id);

                        return (
                          <td key={op.id} className="px-3.5 py-2.5 text-right align-baseline">
                            {holding ? (
                              <>
                                <span
                                  className={`font-cond text-[17px] font-semibold ${
                                    holding.below ? 'text-danger' : ''
                                  }`}
                                >
                                  {holding.stock_qty.toLocaleString('en-IN')}
                                </span>
                                {holding.reorder_level !== null ? (
                                  <p className="text-[12px] text-ink-45">
                                    of {holding.reorder_level.toLocaleString('en-IN')}
                                  </p>
                                ) : null}
                              </>
                            ) : (
                              <span className="text-ink-22">—</span>
                            )}
                          </td>
                        );
                      })}

                      {!operator && stock.operators.length > 1 ? (
                        <td className="font-cond px-3.5 py-2.5 text-right align-baseline text-[17px] font-semibold">
                          {row.total.toLocaleString('en-IN')}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {stock.rows.length > 0 ? (
            <p className="border-t border-ink-12 px-5 py-2.5 text-[12.5px] text-ink-45">
              A figure in magenta is at or below that operator&rsquo;s reorder level. The
              second line is the level itself.
            </p>
          ) : null}
        </section>
      </div>
    </>
  );
}
