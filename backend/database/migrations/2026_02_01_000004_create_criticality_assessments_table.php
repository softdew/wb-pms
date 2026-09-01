<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('criticality_assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('equipment_id')->constrained()->cascadeOnDelete();

            $table->unsignedTinyInteger('consequence_c');
            $table->unsignedTinyInteger('exposure_e');
            $table->unsignedTinyInteger('redundancy_r');

            // Computed by the application, never entered. Held here as well as
            // on the equipment row so a historic assessment keeps the band it
            // was approved under even if thresholds are later recalibrated.
            $table->unsignedSmallInteger('criticality_index');
            $table->string('band', 16);
            $table->unsignedSmallInteger('high_threshold_applied');
            $table->unsignedSmallInteger('medium_threshold_applied');

            $table->string('status', 16)->default('pending');

            $table->foreignId('assessed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('assessed_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();

            // Why this assessment was raised: initial, modification,
            // duty_change, repeated_failure, statutory_change.
            $table->string('review_trigger', 32)->nullable();
            $table->text('justification')->nullable();
            $table->text('decision_remarks')->nullable();

            $table->timestamps();

            $table->index(['organisation_id', 'equipment_id', 'status']);
            $table->index(['organisation_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('criticality_assessments');
    }
};
