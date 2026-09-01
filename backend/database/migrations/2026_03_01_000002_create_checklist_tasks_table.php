<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The reusable library. One task defined once and applied to many assets --
 * proliferation of single-use tasks is what makes a PMS unmaintainable.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('checklist_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('equipment_category_id')->nullable()->constrained()->nullOnDelete();

            $table->string('code', 64);
            $table->string('activity_description', 500);

            // Grouping and print order, so an export reproduces the client's
            // sheet layout ("Main Engine Overhaul", "M/E LO Pump").
            $table->string('section')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);

            // Interval as value plus unit. Nullable because condition and event
            // triggers have no interval at all.
            $table->decimal('default_interval_value', 12, 2)->nullable();
            $table->string('default_interval_unit', 16)->nullable();

            // "1st after 50 hours and then every 500 Hrs." -- a first service
            // that differs from the recurring interval.
            $table->decimal('first_interval_value', 12, 2)->nullable();

            $table->string('default_trigger_class', 32)->default('calendar');

            // OEM manual clause, drawing or statutory rule. The "Reference
            // Section" column on the client's sheet (5.1.1, 5.3.1 and so on).
            $table->string('controlling_reference', 128)->nullable();

            $table->decimal('estimated_hours', 8, 2)->nullable();
            $table->foreignId('trade_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedSmallInteger('persons_required')->nullable();

            $table->text('safety_instructions')->nullable();
            $table->text('permits_required')->nullable();
            $table->text('acceptance_criteria')->nullable();
            $table->string('criticality', 16)->nullable();

            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['organisation_id', 'code']);
            $table->index('organisation_id');
            $table->index(['organisation_id', 'equipment_category_id']);
            $table->index(['organisation_id', 'section', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('checklist_tasks');
    }
};
