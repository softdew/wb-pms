<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One library task applied to one asset, with its own interval and trigger.
 *
 * An asset may carry several plan lines against the same task where different
 * trigger classes apply -- an annual calendar check and a 500-hour meter check
 * on the same activity. The earliest maturing line determines what is due.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('maintenance_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('equipment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('checklist_task_id')->constrained()->cascadeOnDelete();

            $table->string('trigger_class', 32);

            // The three source values are all retained. The shortest is applied
            // by default; any departure carries a reason.
            $table->decimal('oem_interval_value', 12, 2)->nullable();
            $table->decimal('statutory_interval_value', 12, 2)->nullable();
            $table->decimal('history_interval_value', 12, 2)->nullable();

            $table->decimal('applicable_interval_value', 12, 2)->nullable();
            $table->string('applicable_interval_unit', 16)->nullable();
            $table->text('interval_reason')->nullable();

            // First service differing from the recurring interval.
            $table->decimal('first_interval_value', 12, 2)->nullable();

            // No extension may be approved beyond this.
            $table->decimal('statutory_outer_limit', 12, 2)->nullable();

            // Condition triggers: the parameter watched and the limit.
            $table->string('condition_parameter')->nullable();
            $table->decimal('condition_limit', 14, 4)->nullable();

            // How far ahead of due the work order is released. Null falls back
            // to the organisation default, or to the longest part lead time.
            $table->unsignedSmallInteger('release_lead_days')->nullable();

            // Per-line override of the amber window.
            $table->unsignedTinyInteger('warning_threshold_percent')->nullable();

            // Completion anchors. The meter reading at completion is what makes
            // "hours since last overhaul" answerable -- a date alone cannot.
            $table->date('last_done_on')->nullable();
            $table->decimal('last_done_meter_reading', 14, 2)->nullable();

            $table->date('next_due_on')->nullable();
            $table->decimal('next_due_meter_reading', 14, 2)->nullable();

            $table->string('due_status', 16)->nullable();
            $table->timestamp('due_status_computed_at')->nullable();

            $table->string('status', 32)->default('active'); // active | suspended
            $table->text('remarks')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['equipment_id', 'checklist_task_id', 'trigger_class'], 'maintenance_plan_unique');
            $table->index('organisation_id');
            $table->index(['organisation_id', 'due_status']);
            $table->index(['organisation_id', 'next_due_on']);
            $table->index(['organisation_id', 'equipment_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maintenance_plans');
    }
};
