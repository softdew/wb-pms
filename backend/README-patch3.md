# Block 3a fixes

Two files. Copy over the existing ones and re-run `php artisan test`.

## 1. `MaintenanceSetting.php` — null defaults

`firstOrCreate([])` returns the in-memory model straight after the insert. It
does not re-read the row, so defaults declared only in the migration are never
hydrated: `warning_threshold_percent` came back null and the typed return on
`DueDateService::warningThreshold()` raised a TypeError. That cascaded into 15
failures from one cause.

Defaults now live on the model as `$attributes`, which is where they belong for
a settings row that is created on demand.

Worth carrying forward: any model created with `firstOrCreate` or `create` and
then read in the same request needs its defaults on the model, not only in the
migration.

## 2. `ModelsUseTenantScopeTest.php` — stale schema

This test inspected the database without `RefreshDatabase`, so it saw whatever
schema `cmms_test` happened to be left in. PHPUnit runs `Tests\Unit` before any
`RefreshDatabase` test triggers `migrate:fresh`, so on every run that added
tables it reported exactly those new tables as unindexed — then passed on the
next run, once the schema had caught up.

That is the whole explanation for the index failures across Blocks 1, 2 and 3.
The composite indexes were correct throughout. The Block 2 migration
`2026_02_01_000005_add_organisation_indexes_to_block2_tables` was not the fix;
running the suite twice was.

**Leave that migration in place.** Explicit single-column indexes on the four
highest-volume tables are defensible on their own merits, and removing it now
would only churn the schema.

## Optional: seed the settings row per organisation

`MaintenanceSetting::current()` creates the row on first use, so nothing is
broken without this. But it is more consistent to create it alongside the
criticality settings when an organisation is set up.

In `database/seeders/ReferenceDataSeeder.php`, add the import:

```php
use App\Models\MaintenanceSetting;
```

and one line to `seedOne()`:

```php
protected function seedOne(): void
{
    $this->seedCriticalityScales();
    MaintenanceSetting::current();      // <-- add this
    $this->seedFailureCodes();
    $this->seedEquipmentCategories();
    $this->seedPartCategories();
    $this->seedTrades();
}
```
