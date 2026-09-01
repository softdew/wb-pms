<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The amber window becomes an absolute figure rather than a percentage.
 *
 * A percentage cannot reproduce the client's own sheet: a task with 200 of 250
 * hours remaining reads "soon" there, while one with 1800 of 5000 reads "ok".
 * It is also the wrong model operationally -- amber exists to say "arrange
 * spares and vessel availability now", which is an absolute lead, not a
 * proportion of the interval.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('maintenance_settings', function (Blueprint $table) {
            $table->dropColumn('warning_threshold_percent');
            $table->decimal('warning_window_hours', 12, 2)->default(250)->after('id');
            $table->unsignedSmallInteger('warning_window_days')->default(14)->after('warning_window_hours');
        });

        Schema::table('maintenance_plans', function (Blueprint $table) {
            $table->dropColumn('warning_threshold_percent');
            // Hours for a meter line, days for a calendar line. Null falls back
            // to the organisation setting.
            $table->decimal('warning_window', 12, 2)->nullable()->after('release_lead_days');
        });
    }

    public function down(): void
    {
        Schema::table('maintenance_settings', function (Blueprint $table) {
            $table->dropColumn(['warning_window_hours', 'warning_window_days']);
            $table->unsignedTinyInteger('warning_threshold_percent')->default(25);
        });

        Schema::table('maintenance_plans', function (Blueprint $table) {
            $table->dropColumn('warning_window');
            $table->unsignedTinyInteger('warning_threshold_percent')->nullable();
        });
    }
};
