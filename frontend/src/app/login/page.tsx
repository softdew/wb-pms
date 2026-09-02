import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  if (await currentUser()) redirect('/fleet');

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Deep water, with the depth contours from the sounding strip. */}
      <section className="deep-surface relative hidden overflow-hidden px-14 py-16 lg:flex lg:flex-col lg:justify-between">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
          viewBox="0 0 800 900"
          preserveAspectRatio="none"
          aria-hidden
        >
          <g fill="none" stroke="rgba(207,226,228,.34)" strokeWidth="1">
            <path d="M0,760 C120,720 200,800 340,760 C480,720 560,800 800,740" />
            <path d="M0,640 C130,600 210,680 350,640 C490,600 570,680 800,620" />
            <path d="M0,520 C140,480 220,560 360,520 C500,480 580,560 800,500" />
            <path d="M0,400 C150,360 230,440 370,400 C510,360 590,440 800,380" />
            <path d="M0,280 C160,240 240,320 380,280 C520,240 600,320 800,260" />
          </g>
        </svg>

        <div className="relative">
          <p className="font-cond text-3xl font-bold text-white">WB PMS</p>
          <p className="mt-1 text-sm text-shoal/75">West Bengal Transport Corporation</p>
        </div>

        <div className="relative max-w-md">
          <h1 className="font-cond text-4xl leading-tight font-semibold text-white">
            Planned maintenance for the inland vessel fleet
          </h1>
          <p className="mt-4 text-shoal/80">
            Every vessel, every engine, every task — with the hours behind it.
          </p>
        </div>

        <p className="relative text-xs text-shoal/50">
          Confidential. Authorised users only.
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <p className="font-cond text-2xl font-bold text-ink">WB PMS</p>
            <p className="mb-8 text-sm text-ink-45">West Bengal Transport Corporation</p>
          </div>

          <h2 className="font-cond text-2xl font-semibold">Sign in</h2>
          <p className="mt-1 mb-7 text-sm text-ink-45">
            Use the account issued by the department.
          </p>

          <LoginForm />
        </div>
      </section>
    </main>
  );
}
