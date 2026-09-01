<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The four mandatory coded fields, plus downtime split into planned and
 * unplanned. Free text is stored alongside them, never in place of them.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_order_closeouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('work_order_id')->unique()->constrained()->cascadeOnDelete();

            $table->foreignId('failure_mode_code_id')->nullable()->constrained('failure_codes')->nullOnDelete();
            $table->foreignId('cause_code_id')->nullable()->constrained('failure_codes')->nullOnDelete();
            $table->foreignId('detection_method_code_id')->nullable()->constrained('failure_codes')->nullOnDelete();
            $table->foreignId('severity_code_id')->nullable()->constrained('failure_codes')->nullOnDelete();

            $table->decimal('planned_downtime_hours', 10, 2)->default(0);
            $table->decimal('unplanned_downtime_hours', 10, 2)->default(0);

            $table->boolean('acceptance_criteria_met')->default(true);
            $table->foreignId('signed_off_by')->nullable()->constrained('users')->nullOnDelete();
            $table->date('completed_on');
            $table->decimal('meter_at_completion', 14, 2)->nullable();

            $table->text('observations')->nullable();
            $table->timestamps();

            $table->index('organisation_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_order_closeouts');
    }
};
