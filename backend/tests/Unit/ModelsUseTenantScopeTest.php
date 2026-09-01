<?php

namespace Tests\Unit;

use App\Models\Concerns\BelongsToOrganisation;
use App\Models\Organisation;
use App\Models\Scopes\OrganisationScope;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use ReflectionClass;
use SplFileInfo;
use Symfony\Component\Finder\Finder;
use Tests\TestCase;


/**
 * The guard that outlives us.
 *
 * The isolation tests prove the scope works on the models that exist today.
 * This one walks every model in app/Models and fails if a new one carries an
 * organisation_id column without the trait -- the mistake most likely to be
 * made in six months by someone who never read the README.
 */
class ModelsUseTenantScopeTest extends TestCase
{
    /**
     * Required. Without it this test inspects whatever schema cmms_test was
     * last left in, and PHPUnit runs Tests\Unit before any RefreshDatabase
     * test triggers migrate:fresh -- so every run that adds tables reports
     * those tables as unindexed, then passes on the next run.
     */
    use RefreshDatabase;

    /**
     * Models that legitimately hold organisation_id without being scoped.
     * User and Organisation are how the tenant context is established, so
     * scoping them would be circular. Nothing else belongs here -- adding to
     * this list should require a good reason and a code review.
     */
    protected array $intentionallyUnscoped = [
        Organisation::class,
        User::class,
    ];

    public function test_every_tenant_owned_model_uses_the_trait(): void
    {
        $offenders = [];

        foreach ($this->modelClasses() as $class) {
            if (in_array($class, $this->intentionallyUnscoped, true)) {
                continue;
            }

            /** @var Model $model */
            $model = new $class;

            if (! Schema::hasColumn($model->getTable(), 'organisation_id')) {
                continue;
            }

            if (! in_array(BelongsToOrganisation::class, class_uses_recursive($class), true)) {
                $offenders[] = $class;
            }
        }

        $this->assertSame([], $offenders, sprintf(
            "These models have an organisation_id column but do not use BelongsToOrganisation:\n  %s\n".
            'Without the trait their rows are visible to every tenant.',
            implode("\n  ", $offenders)
        ));
    }

    /** Having the trait is not enough -- the scope must actually be attached. */
    public function test_the_trait_actually_registers_the_global_scope(): void
    {
        foreach ($this->modelClasses() as $class) {
            if (! in_array(BelongsToOrganisation::class, class_uses_recursive($class), true)) {
                continue;
            }

            /** @var Model $model */
            $model = new $class;

            $this->assertArrayHasKey(
                OrganisationScope::class,
                $model->getGlobalScopes(),
                $class.' uses the trait but has no OrganisationScope registered.'
            );
        }
    }

    /** A tenant column with no index is a table scan on every single query. */
    public function test_tenant_tables_index_the_organisation_column(): void
    {
        $unindexed = [];

        foreach ($this->modelClasses() as $class) {
            if (! in_array(BelongsToOrganisation::class, class_uses_recursive($class), true)) {
                continue;
            }

            $table = (new $class)->getTable();

            if (! $this->hasIndexLeadingWith($table, 'organisation_id')) {
                $unindexed[] = $table;
            }
        }

        $this->assertSame([], $unindexed, sprintf(
            "These tables have no index leading with organisation_id:\n  %s\n".
            'Every query on them filters by that column, so each one is a table scan.',
            implode("\n  ", $unindexed)
        ));
    }

    /**
     * Read the catalogue directly rather than using Schema::getIndexes().
     * That helper does not guarantee column ordering across drivers, and the
     * leading column is the entire point of this check.
     *
     * A composite index counts: unique(organisation_id, code) serves a query
     * filtering on organisation_id alone. Note that PostgreSQL does not create
     * an index for a foreign key, so the constraint on its own is not enough.
     */
    protected function hasIndexLeadingWith(string $table, string $column): bool
    {
        $rows = DB::select(<<<'SQL'
            select a.attname as first_column
            from pg_index i
            join pg_class t on t.oid = i.indrelid
            join pg_namespace n on n.oid = t.relnamespace
            join pg_attribute a on a.attrelid = t.oid and a.attnum = i.indkey[0]
            where t.relname = ? and n.nspname = current_schema()
        SQL, [$table]);

        foreach ($rows as $row) {
            if ($row->first_column === $column) {
                return true;
            }
        }

        return false;
    }


    /** @return list<class-string<Model>> */
    protected function modelClasses(): array
    {
        $classes = [];

        $finder = (new Finder)
            ->files()
            ->in(app_path('Models'))
            ->name('*.php');

        foreach ($finder as $file) {
            /** @var SplFileInfo $file */
            $class = 'App\\Models\\'.Str::of($file->getRelativePathname())
                ->replace(['/', '\\'], '\\')
                ->replace('.php', '')
                ->value();

            if (! class_exists($class)) {
                continue;
            }

            $reflection = new ReflectionClass($class);

            if ($reflection->isAbstract() || ! $reflection->isSubclassOf(Model::class)) {
                continue;
            }

            $classes[] = $class;
        }

        sort($classes);

        return $classes;
    }
}
