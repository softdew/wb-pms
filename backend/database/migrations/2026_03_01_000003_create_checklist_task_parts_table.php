<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Spares, consumables and special tools a task calls for. This is what lets a
 * work order be kitted before release, and what drives the release lead time
 * from the longest part lead time.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('checklist_task_parts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('checklist_task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('part_id')->constrained('parts')->cascadeOnDelete();

            $table->decimal('quantity', 12, 3)->default(1);
            $table->string('line_type', 32)->default('spare');
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->unique(['checklist_task_id', 'part_id', 'line_type'], 'checklist_task_part_unique');
            $table->index('organisation_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('checklist_task_parts');
    }
};
