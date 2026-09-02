# Demo: the client's Main Engine sheet, in and back out

Three files plus one small edit. About ten minutes to run.

## Install

Copy in:

- `database/seeders/MainEngineDemoSeeder.php`
- `app/Exports/MainEngineSheetExport.php`
- `app/Console/Commands/ExportMainEngineSheet.php`

Then apply the edit in `EQUIPMENT-PATCH.md` — two relation methods on
`app/Models/Equipment.php`.

## Run

```
php artisan db:seed --class=MainEngineDemoSeeder
php artisan cmms:recompute-due-dates
php artisan cmms:export-main-engine MV01-ME-01 --month=2026-09
```

The file lands in `storage/app/private/` (Laravel 11+) or `storage/app/`.

## What gets loaded

Everything below is from `SM_Templates.xlsx` as supplied — 21 tasks with their
real intervals and reference sections, the engine at 3,200 running hours, and
the three overhauls their sheet actually records.

The previous month is seeded at 2,950 hrs so the "running hrs last month"
figure has something to compute from. Their own sheet leaves that cell blank.

## Rows worth checking against their sheet

| Their row | Task | Interval | Last done | Expect |
| --- | --- | --- | --- | --- |
| 12 | Lube oil filter cartridge | 500 | 3,100 hrs | 100 since, 400 to go, **ok** |
| 11 | Change engine oil | 500 | 2,600 hrs | 600 since, −100 to go, **due** |
| 14 | V-belt condition and tension | 250 | 3,150 hrs | 50 since, 200 to go, **soon** |
| 16 | Clean radiator tubes internally | 5,000 | never | 3,200 since, 1,800 to go, **ok** |
| 7–10 | 10-hour checks | 10 | never | −3,190 to go, **due** |

If those five match, the arithmetic is right and the sheet can go to the client.

## The conversation this is for

Rows 7 to 10 are the point worth raising. Four tasks read permanently due
because no completion has ever been recorded against them — which is exactly
what their own sheet shows. It is not a defect in either system; it means
10-hour checks are being done but not logged, and the register cannot tell the
difference between "not done" and "not recorded".

Three questions follow naturally from putting this file in front of them:

1. How often are running hours actually recorded? If monthly, no task with an
   interval under about 250 hours can ever show anything but due, and those
   checks probably belong outside the scheduler as operator-care rounds.
2. Within how many running hours should a task start showing amber? Their sheet
   has exactly one "soon" row, which places it between 200 and 400. The system
   currently uses 250 and it is a setting, not a constant.
3. Who signs off criticality bands? Scoring and approval are deliberately
   separate actions by separate people, so a reviewing authority has to exist
   before any asset can be banded.

And the ask that matters: confirm v1.6 as the requirement baseline, so
everything after it is a change request.
