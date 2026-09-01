# Tests for Block 1

Two files, both about one thing: nobody sees another operator's data.

| File | Purpose |
| --- | --- |
| `tests/Feature/Tenancy/TenantIsolationTest.php` | Proves the scope works — reads, writes, updates, deletes, aggregates, relations, `eachOrganisation()` and `unscoped()`. |
| `tests/Unit/ModelsUseTenantScopeTest.php` | Proves it keeps working — walks every model in `app/Models` and fails if a new one has an `organisation_id` column without the trait. |

## Install

Copy both files into `backend/tests/`, keeping the folder structure.

`RefreshDatabase` migrates a fresh schema for each test, so point the test run
at a **separate database** — never the one holding your working data.

Create it once:

```
psql -U postgres -c "CREATE DATABASE cmms_test;"
```

Then in `backend/phpunit.xml`, inside `<php>`, add or amend:

```xml
<env name="DB_CONNECTION" value="pgsql"/>
<env name="DB_DATABASE" value="cmms_test"/>
```

Laravel 13 ships `phpunit.xml` with sqlite in-memory settings — replace those
two lines rather than adding alongside, or the tests will run against sqlite
and prove nothing about the Postgres schema.

## Run

```
php artisan test
php artisan test --filter=TenantIsolation
php artisan test tests/Unit/ModelsUseTenantScopeTest.php
```

## Reading a failure

**`No organisation context set`** raised by a test that did not expect it —
console or queued code is querying outside `Tenancy::runFor()`. That is the
scope doing its job; fix the caller, not the scope.

**`test_every_tenant_owned_model_uses_the_trait` fails** — a model gained an
`organisation_id` column without `BelongsToOrganisation`. Its rows are visible
to every tenant. Add the trait; do not add the model to
`$intentionallyUnscoped` unless it is genuinely part of establishing the tenant
context.

**`test_tenant_tables_index_the_organisation_column` fails** — a new table has
no index leading with `organisation_id`. Every query filters on that column, so
without it each one is a table scan.

**`test_a_record_forced_to_another_organisation_is_not_visible_here` fails** —
the scope is being bypassed on write. Serious; stop and investigate.

## Adding to these

Every block adds models. When Block 2 lands `vessels`, `equipment` and
`equipment_meter_readings`, the unit test picks them up automatically — no edit
needed. That is the point of walking the directory rather than listing classes.
