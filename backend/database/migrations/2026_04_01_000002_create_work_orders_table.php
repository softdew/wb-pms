<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            $table->string('number', 32);

            $table->foreignId('equipment_id')->constrained()->cascadeOnDelete();
            // Null for breakdown work, which is raised against the asset rather
            // than against a planned task.
            $table->foreignId('maintenance_plan_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('checklist_task_id')->nullable()->constrained()->nullOnDelete();

            $table->string('type', 32);
            $table->string('status', 32)->default('draft');
            $table->string('backlog_state', 48)->nullable();
            $table->string('executing_entity', 32)->nullable();

            $table->string('description', 500);
            $table->string('priority', 16)->nullable();

            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('vendor_id')->nullable()->constrained()->nullOnDelete();
            $table->string('permit_reference', 128)->nullable();

            $table->date('due_on')->nullable();
            $table->decimal('due_meter_reading', 14, 2)->nullable();
            $table->date('released_on')->nullable();
            $table->date('started_on')->nullable();
            $table->date('completed_on')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->decimal('meter_at_completion', 14, 2)->nullable();

            $table->decimal('estimated_hours', 8, 2)->nullable();
            $table->decimal('estimated_cost', 14, 2)->nullable();
            $table->decimal('actual_cost', 14, 2)->nullable();

            /**
             * The checklist task exactly as it stood when the work order was
             * released. Without this, editing a task in 2027 silently rewrites
             * what a 2026 work order claims to have done.
             */
            $table->jsonb('task_snapshot')->nullable();

            $table->text('remarks')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['organisation_id', 'number']);
            $table->index('organisation_id');
            $table->index(['organisation_id', 'status']);
            $table->index(['organisation_id', 'backlog_state']);
            $table->index(['organisation_id', 'equipment_id', 'status']);
            $table->index(['organisation_id', 'due_on']);
        });

        Schema::table('stock_transactions', function (Blueprint $table) {
            $table->foreign('work_order_id')->references('id')->on('work_orders')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('stock_transactions', function (Blueprint $table) {
            $table->dropForeign(['work_order_id']);
        });

        Schema::dropIfExists('work_orders');
    }
};
