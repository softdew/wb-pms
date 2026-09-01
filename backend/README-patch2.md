# Block 2 fixes

Copy these over the files already in `backend/`, then:

```
php artisan migrate
php artisan test
```

## What each fix addresses

### 1. `Equipment.php` — non-deterministic ordering

`criticalityAssessments()` ordered by `created_at` alone. Two assessments
created in the same second tie, so `first()` returned an arbitrary one and
`the full history is retained` failed intermittently.

This was a real bug, not a test artefact: the same relation drives "current
assessment" on screen, so it would have shown the wrong one under fast entry.
Both relations now break the tie on `id`.

### 2. `MeterReadingService.php` — back-dated readings

The guard compared every new reading against `equipment.current_meter_reading`,
which is the *latest* figure. A back-dated correction was therefore judged
against readings taken after it and rejected.

It now finds the reading immediately before the new one's date and compares
against that. It also rejects a back-dated reading that exceeds a reading
already recorded after it, since that would make the meter appear to run
backwards over that interval. `previous_value` is now the genuinely preceding
reading rather than whatever happened to be current.

### 3. `CriticalityScoringTest.php` — PHPUnit 12

PHPUnit 12 no longer reads the `@dataProvider` docblock; it requires the
`#[DataProvider]` attribute. Nothing wrong with the code — the annotation was
simply ignored, so the test ran with no arguments.

Worth knowing for every future data-driven test in this project.

### 4. New migration — explicit organisation indexes

The four Block 2 tables already carry composite indexes leading with
`organisation_id`. This adds named single-column indexes so the guard test can
see them without inference. These are the highest-volume tables in the system,
so the redundancy is cheap.

## Diagnostic worth running once

Before applying the migration, it is worth knowing why the composite indexes
were not detected, since Block 1's were. In `php artisan tinker`:

```php
>>> DB::select("
...   select i.relname as index_name,
...          array_to_string(array_agg(a.attname order by k.ord), ',') as columns
...   from pg_index x
...   join pg_class t on t.oid = x.indrelid
...   join pg_class i on i.oid = x.indexrelid
...   join lateral unnest(x.indkey) with ordinality as k(attnum, ord) on true
...   join pg_attribute a on a.attrelid = t.oid and a.attnum = k.attnum
...   where t.relname = 'vessels'
...   group by i.relname
... ");
```

If `vessels_organisation_id_code_unique` comes back with columns
`organisation_id,code`, the index exists and the guard test's detection needs
adjusting rather than the schema. Paste the output if it does.
