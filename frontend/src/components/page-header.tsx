export function PageHeader({
  title,
  crumb,
  meta,
  actions,
}: {
  title: string;
  crumb?: string;
  meta?: { label: string; value: string }[];
  actions?: React.ReactNode;
}) {
  return (
    <header className="border-b border-ink-12 bg-white px-7 pt-5 pb-5">
      {crumb ? <p className="mb-1.5 text-[13px] text-ink-45">{crumb}</p> : null}

      <div className="flex flex-wrap items-end gap-5">
        <h1 className="text-[29px] leading-tight font-semibold">{title}</h1>

        {meta?.length ? (
          <dl className="flex flex-wrap gap-6 pb-1">
            {meta.map((item) => (
              <div key={item.label}>
                <dt className="text-[13px] text-ink-45">{item.label}</dt>
                <dd className="font-medium">{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {actions ? <div className="ml-auto flex gap-2 pb-0.5">{actions}</div> : null}
      </div>
    </header>
  );
}
