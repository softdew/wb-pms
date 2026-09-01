<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Explicit single-column indexes on organisation_id.
 *
 * These four tables already carry composite indexes that lead with
 * organisation_id, which in principle serves a query filtering on it alone.
 * They are named explicitly here for two reasons: these are the highest-volume
 * tables in the system, and an index the guard test can see without ambiguity
 * is worth more than one it has to infer.
 */
return new class extends Migration
{
    protected array $tables = [
        'vessels',
        'equipment',
        'equipment_meter_readings',
        'criticality_assessments',
    ];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $blueprint) use ($table) {
                $blueprint->index('organisation_id', $table.'_organisation_id_index');
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $blueprint) use ($table) {
                $blueprint->dropIndex($table.'_organisation_id_index');
            });
        }
    }
};
