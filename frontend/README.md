# WB PMS — frontend

Next.js App Router, TypeScript, Tailwind v4. Talks to the Laravel API in
`../backend`.

## Setup

From `C:\wamp64\www\wb-pms\frontend`:

```
npm install
copy .env.local.example .env.local
npm run dev
```

Then open http://localhost:3000. The backend must be running:

```
cd ..\backend
php artisan serve
```

## How authentication works

The bearer token is kept in an **httpOnly cookie**, so no script on the page can
read it. Two consequences worth knowing:

- Server components call Laravel directly through `lib/api.ts`, which attaches
  the token from the cookie.
- Client components call `/api/proxy/...`, a route handler that forwards to
  Laravel with the token added. The browser never holds it.

`signIn` and `signOut` are server actions in `actions/auth.ts`.

## Design

The palette is an Admiralty chart: deep-water ink, chart-paper ground, shoal
cyan, buff for section bands. Hazards are **magenta**, which is the chart
convention, rather than the red every other maintenance system uses.

Tokens live in `app/globals.css` under `@theme`. There is no `tailwind.config.ts`
— Tailwind v4 is configured in CSS.

Typography is Barlow with Barlow Condensed for headings and figures. One family,
two widths. Tabular figures are on globally, because hours and readings sit in
columns and must align.

## Structure

```
src/
  actions/auth.ts          sign in and out (server actions)
  app/
    (app)/                 authenticated area, shares the rail
      fleet/               landing page
      vessels/             the register
    api/proxy/[...path]/   token-attaching proxy for client calls
    login/                 sign in
  components/              rail, page header, status badges, empty states
  lib/
    api.ts                 server-side API client
    auth.ts                current user, role helpers
    format.ts              labels and number formatting
    session.ts             the httpOnly cookie
  types/api.ts             API response shapes
```

## Still to build

Vessel detail with the maintenance schedule, the sounding strip, work order
list and detail, criticality scoring and approval, the task library, plans, and
the master-data screens. `vessels/page.tsx` is the pattern to follow: fetch in a
server component, render a plain table, let the API do the scoping.

## Two things to know

**Scoping is the API's job.** An operating company receives only its own
vessels because the backend filters them, not because this app hides rows.
Never add client-side filtering that pretends to be access control.

**Roles hide navigation, they do not enforce it.** `components/rail.tsx` omits
what a role cannot use, which is courtesy. The API refuses regardless.
