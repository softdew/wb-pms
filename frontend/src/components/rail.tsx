import Link from 'next/link';
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
import { hasRole, isOperator } from '@/lib/auth';
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
		{ href: '/criticality', label: 'Criticality', icon: IconScale },
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

  if (hasRole(user, 'department-admin', 'technical-authority', 'planner')) {
    groups.push({
      heading: 'Setup',
      items: [
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

export function Rail({
  user,
  current,
  counts = {},
}: {
  user: CurrentUser;
  current: string;
  counts?: RailCounts;
}) {
  const roleLabel = user.is_platform_admin
    ? 'Platform administrator'
    : (user.roles[0] ?? 'no role assigned').replace(/-/g, ' ');

  return (
    <aside className="rail-surface rail-edge relative sticky top-0 flex h-screen flex-col overflow-hidden text-[#E4F1F2]">
      {/* Depth contours rising from the foot of the rail. */}
      <svg
        className="pointer-events-none absolute right-0 bottom-0 left-0 h-48 w-full opacity-[0.30]"
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

      <div className="relative flex items-center gap-3 px-5 pt-5 pb-5">
        <Mark />
        <div className="min-w-0">
          <p className="font-cond text-[22px] leading-none font-bold tracking-wide text-white">
            WB PMS
          </p>
          <p className="mt-1 truncate text-[11.5px] leading-snug text-shoal/70">
            {user.organisation?.name ?? 'No organisation'}
          </p>
        </div>
      </div>

      <nav className="relative flex-1 overflow-y-auto px-2.5 pb-3">
        {groupsFor(user, counts).map((group, index) => (
          <div key={group.heading}>
            <p
              className={`font-cond px-3 pb-1 text-[11.5px] font-semibold tracking-[0.16em] text-shoal/55 uppercase ${
                index === 0 ? 'pt-1' : 'mt-3 border-t border-shoal/12 pt-3.5'
              }`}
            >
              {group.heading}
            </p>

            {group.items.map((item) => {
              const path = item.href.split('?')[0];
              const active = current === path || current.startsWith(path + '/');
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`group relative flex items-center gap-2.5 rounded-md py-[7px] pr-2.5 pl-3 text-[14px] transition-colors ${
                    active
                      ? 'bg-shoal/[0.16] font-medium text-white shadow-[inset_0_1px_0_rgba(159,216,222,.18)]'
                      : 'text-white/78 hover:bg-shoal/[0.08] hover:text-white'
                  }`}
                >
                  {/* Chart magenta marks the current place. */}
                  <span
                    className={`absolute top-1.5 bottom-1.5 -left-0.5 w-[2.5px] rounded-full transition-colors ${
                      active ? 'bg-danger shadow-[0_0_10px_rgba(219,10,102,.7)]' : 'bg-transparent'
                    }`}
                    aria-hidden
                  />
                  <Icon
                    className={`h-[17px] w-[17px] shrink-0 transition-colors ${
                      active ? 'text-shoal' : 'text-shoal/55 group-hover:text-shoal'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                  {item.count !== undefined && item.count > 0 ? (
                    <span
                      className={`font-cond ml-auto rounded px-1.5 text-[13px] leading-[18px] font-semibold ${
                        item.tone === 'due'
                          ? 'bg-danger/25 text-[#FF6FA8]'
                          : 'text-shoal/60 group-hover:text-shoal'
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

      <div className="relative flex items-center gap-2.5 border-t border-shoal/15 px-5 py-3.5">
        <span
          className="font-cond flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-shoal/20 text-[14px] font-semibold text-shoal"
          aria-hidden
        >
          {initials(user.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] leading-tight text-white">{user.name}</p>
          <p className="truncate text-[12px] text-shoal/65 capitalize">{roleLabel}</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            title="Sign out"
            aria-label="Sign out"
            className="rounded p-1.5 text-shoal/55 transition-colors hover:bg-shoal/15 hover:text-white"
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
