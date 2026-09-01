<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Values to be recorded on completion, with their units and acceptance limits.
 * Captured per task rather than per work order, so a reading always carries the
 * limits it was judged against.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('checklist_task_readings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('checklist_task_id')->constrained()->cascadeOnDelete();

            $table->string('parameter');
            $table->string('unit', 32)->nullable();
            $table->decimal('minimum', 14, 4)->nullable();
            $table->decimal('maximum', 14, 4)->nullable();
            $table->boolean('is_mandatory')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index('organisation_id');
            $table->index(['checklist_task_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('checklist_task_readings');
    }
};
