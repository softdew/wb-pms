<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Readings copied from the task definition at release, each carrying
        // the limits it is to be judged against.
        Schema::create('work_order_readings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('work_order_id')->constrained()->cascadeOnDelete();

            $table->string('parameter');
            $table->string('unit', 32)->nullable();
            $table->decimal('minimum', 14, 4)->nullable();
            $table->decimal('maximum', 14, 4)->nullable();
            $table->boolean('is_mandatory')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);

            $table->decimal('value', 14, 4)->nullable();
            $table->boolean('is_within_limits')->nullable();
            $table->text('observation')->nullable();
            $table->timestamps();

            $table->index('organisation_id');
            $table->index(['work_order_id', 'sort_order']);
        });

        // Planned versus actual spares.
        Schema::create('work_order_parts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('work_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('part_id')->constrained()->cascadeOnDelete();

            $table->decimal('planned_quantity', 14, 3)->default(0);
            $table->decimal('actual_quantity', 14, 3)->nullable();
            $table->string('line_type', 32)->default('spare');
            $table->timestamps();

            $table->index('organisation_id');
            $table->unique(['work_order_id', 'part_id', 'line_type'], 'work_order_part_unique');
        });

        // Labour by trade: standard against actual, which is what makes cost
        // per asset and estimate accuracy answerable.
        Schema::create('work_order_labour', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('work_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('trade_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

            $table->decimal('standard_hours', 8, 2)->nullable();
            $table->decimal('actual_hours', 8, 2)->nullable();
            $table->unsignedSmallInteger('persons')->default(1);
            $table->date('worked_on')->nullable();
            $table->timestamps();

            $table->index('organisation_id');
            $table->index('work_order_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_order_labour');
        Schema::dropIfExists('work_order_parts');
        Schema::dropIfExists('work_order_readings');
    }
};
