'use client';

import { useState } from 'react';

/**
 * The password, shown once.
 *
 * There is no way to read it back — resetting issues a new one. Saying so
 * plainly is kinder than letting an admin close the page and find out.
 */
export function CredentialsPanel({
  email,
  password,
  operatorName,
}: {
  email: string;
  password: string;
  operatorName: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(`${email}\n${password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section className="overflow-hidden rounded-lg border border-safe/30 bg-safe-soft">
      <div className="border-b border-safe/20 px-5 py-3">
        <h2 className="font-cond text-[19px] font-semibold text-safe">Login issued for {operatorName}</h2>
        <p className="text-[13px] text-ink-70">
          Hand these over now. The password is not stored in readable form and cannot be
          shown again — a reset issues a new one.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-6 px-5 py-4">
        <div>
          <p className="text-[12.5px] text-ink-45">Email</p>
          <p className="font-cond text-[18px] font-semibold">{email}</p>
        </div>
        <div>
          <p className="text-[12.5px] text-ink-45">Password</p>
          <p className="font-cond text-[18px] font-semibold tracking-wide">{password}</p>
        </div>
        <button
          onClick={copy}
          className="ml-auto rounded-md border border-safe/40 bg-white px-3.5 py-1.5 text-[13.5px] font-medium text-safe hover:bg-safe-soft"
        >
          {copied ? 'Copied' : 'Copy both'}
        </button>
      </div>
    </section>
  );
}
