'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { signOut } from '@/actions/auth';
import {
  IconCode,
  IconEquipment,
  IconIncharge,
  IconLibrary,
  IconOperator,
  IconOverdue,
  IconPart,
  IconScale,
  IconSchedule,
  IconSounding,
  IconStock,
  IconUsers,
  IconUsers as IconPeople,
  IconVessel,
  IconWorkOrder,
  Mark,
} from '@/components/icons';
import { hasRole, isOperator } from '@/lib/roles';
import type { CurrentUser } from '@/types/api';

type IconComponent = (props: { className?: string }) => React.ReactElement;

interface Item {
  href: string;
  label: string;
  icon: IconComponent;
  count?: number;
  tone?: 'due' | 'plain';
}

interface Group {
  heading: string;
  items: Item[];
}

export interface RailCounts {
  workOrders?: number;
  overdue?: number;
  vessels?: number;
  plans?: number;
  belowReorder?: number;
}

function groupsFor(user: CurrentUser, counts: RailCounts): Group[] {
  const operator = isOperator(user);

  const groups: Group[] = [
    {
      heading: 'Today',
      items: [
        { href: '/fleet', label: 'Fleet status', icon: IconSounding },
        { href: '/work-orders', label: 'Work orders', icon: IconWorkOrder, count: counts.workOrders },
        ...(counts.overdue
          ? [
              {
                href: '/plans?due_status=due',
                label: 'Overdue tasks',
                icon: IconOverdue,
                count: counts.overdue,
                tone: 'due' as const,
              },
            ]
          : []),
      ],
    },
    {
      heading: 'Fleet',
      items: [
        { href: '/vessels', label: 'Vessels', icon: IconVessel, count: counts.vessels },
        { href: '/equipment', label: 'Equipment', icon: IconEquipment },
        { href: '/plans', label: 'Maintenance plans', icon: IconSchedule, count: counts.plans },
      ],
    },
    {
      heading: 'Stores',
      items: [
        { href: '/parts', label: 'Parts catalogue', icon: IconPart },
        {
          href: '/stock',
          label: operator ? 'Our stock' : 'Stock by operator',
          icon: IconStock,
          count: counts.belowReorder,
          tone: counts.belowReorder ? 'due' : 'plain',
        },
      ],
    },
  ];

  if (!operator) {
    groups[1].items.push({ href: '/task-library', label: 'Task library', icon: IconLibrary });
    groups.push({
      heading: 'Operators',
      items: [
        { href: '/operators', label: 'Operating companies', icon: IconOperator },
        { href: '/incharges', label: 'Vessel in-charges', icon: IconIncharge },
      ],
    });
  }

  /*if (hasRole(user, 'department-admin', 'technical-authority')) {
    groups.push({
      heading: 'Setup',
      items: [
        { href: '/setup/criticality', label: 'Criticality scales', icon: IconScale },
        { href: '/setup/codes', label: 'Failure codes', icon: IconCode },
        ...(hasRole(user, 'department-admin')
          ? [{ href: '/setup/users', label: 'Users & roles', icon: IconPeople }]
          : []),
      ],
    });
  }*/
  
  if (hasRole(user, 'department-admin', 'technical-authority', 'planner')) {
    groups.push({
      heading: 'Setup',
      items: [
        // The seven master tables are tabs inside one screen, not seven entries.
        { href: '/setup/ship-types', label: 'Master data', icon: IconLibrary },
        { href: '/criticality', label: 'Criticality', icon: IconScale },
        ...(hasRole(user, 'department-admin')
          ? [{ href: '/setup/users', label: 'Users & roles', icon: IconPeople }]
          : []),
      ],
    });
  }

  return groups;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function Rail({ user, counts = {} }: { user: CurrentUser; counts?: RailCounts }) {
  // usePathname updates on every navigation. Reading it from a header in the
  // layout did not: layouts are preserved between sibling routes, so the rail
  // kept whichever path it saw first.
  const current = usePathname();
  const params = useSearchParams();
  const groups = groupsFor(user, counts);

  /**
   * Only the most specific entry lights up.
   *
   * "Overdue tasks" points at /plans?due_status=due and "Maintenance plans" at
   * /plans, so matching on path alone lit both. An entry carrying a query is
   * more specific than one without, and the longest match wins.
   */
  const activeHref = useMemo(() => {
    const matches = groups
      .flatMap((group) => group.items)
      .filter((item) => {
        const [path, query] = item.href.split('?');

        if (current !== path && !current.startsWith(path + '/')) return false;
        if (!query) return true;

        return [...new URLSearchParams(query).entries()].every(
          ([key, value]) => params.get(key) === value,
        );
      });

    return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href;
  }, [current, params, groups]);

  // Superadmin and department administrator are the same person here; there is
  // no tier above the organisation in this deployment.
  const roleLabel =
    user.is_platform_admin || user.roles.includes('department-admin')
      ? 'Superadmin'
      : (user.roles[0] ?? 'no role assigned').replace(/-/g, ' ');

  return (
    <aside className="relative sticky top-0 flex h-screen flex-col overflow-hidden bg-ink text-[#DCE8E8]">
      {/* Depth contours rising from the foot of the rail. */}
      <svg
        className="pointer-events-none absolute right-0 bottom-0 left-0 h-48 w-full opacity-[0.18]"
        viewBox="0 0 240 190"
        preserveAspectRatio="none"
        aria-hidden
      >
        <g fill="none" stroke="#CFE2E4" strokeWidth="1">
          <path d="M0,162 C50,150 90,176 140,160 C190,144 215,170 240,156" />
          <path d="M0,132 C55,118 95,146 145,128 C195,110 218,138 240,122" />
          <path d="M0,102 C60,86 100,116 150,96 C200,76 220,106 240,88" />
          <path d="M0,72 C60,56 100,86 150,66 C200,46 220,76 240,58" />
        </g>
      </svg>

      <div className="relative flex items-center gap-3 px-5 pt-5 pb-4">
        <Mark />
        <div className="min-w-0">
          <p className="font-cond text-[22px] leading-none font-bold tracking-wide text-white">
            WB PMS
          </p>
          <p className="mt-1 truncate text-[11.5px] leading-snug text-white/45">
            {user.organisation?.name ?? 'No organisation'}
          </p>
        </div>
      </div>

      <nav className="relative flex-1 overflow-y-auto px-2.5 pb-3">
        {groups.map((group, index) => (
          <div key={group.heading}>
            <p
              className={`font-cond px-3 pb-1 text-[11.5px] font-semibold tracking-[0.16em] text-white/30 uppercase ${
                index === 0 ? 'pt-1' : 'mt-3 border-t border-white/[0.07] pt-3.5'
              }`}
            >
              {group.heading}
            </p>

            {group.items.map((item) => {
              const active = item.href === activeHref;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`group relative flex items-center gap-2.5 rounded-md py-[7px] pr-2.5 pl-3 text-[14px] transition-colors ${
                    active
                      ? 'bg-white/[0.10] font-medium text-white'
                      : 'text-white/65 hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  {/* Chart magenta marks the current place. */}
                  <span
                    className={`absolute top-1.5 bottom-1.5 -left-0.5 w-[2.5px] rounded-full transition-colors ${
                      active ? 'bg-danger' : 'bg-transparent'
                    }`}
                    aria-hidden
                  />
                  <Icon
                    className={`h-[17px] w-[17px] shrink-0 transition-colors ${
                      active ? 'text-shoal' : 'text-white/40 group-hover:text-white/70'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                  {item.count !== undefined && item.count > 0 ? (
                    <span
                      className={`font-cond ml-auto rounded px-1.5 text-[13px] leading-[18px] font-semibold ${
                        item.tone === 'due'
                          ? 'bg-danger/20 text-danger'
                          : 'text-white/40 group-hover:text-white/60'
                      }`}
                    >
                      {item.count}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="relative flex items-center gap-2.5 border-t border-white/10 px-5 py-3.5">
        <span
          className="font-cond flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-shoal/15 text-[14px] font-semibold text-shoal"
          aria-hidden
        >
          {initials(user.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] leading-tight text-white">{user.name}</p>
          <p className="truncate text-[12px] text-white/45 capitalize">{roleLabel}</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            title="Sign out"
            aria-label="Sign out"
            className="rounded p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[17px] w-[17px]"
              aria-hidden
            >
              <path d="M15 17.5v1.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1.5" />
              <path d="M19.5 12H10M17 9l3 3-3 3" />
            </svg>
          </button>
        </form>
      </div>
    </aside>
  );
}
