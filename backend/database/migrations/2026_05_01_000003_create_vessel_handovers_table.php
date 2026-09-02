<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The record of a vessel passing from one operator to the next at the end of a
 * tender.
 *
 * Running hours, open work orders and condition at the moment of transfer are
 * exactly what the incoming and outgoing operators argue about otherwise. The
 * maintenance history itself does not move -- it belongs to the vessel.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vessel_handovers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('vessel_id')->constrained()->cascadeOnDelete();

            $table->foreignId('from_operator_id')->nullable()->constrained('operators')->nullOnDelete();
            $table->foreignId('to_operator_id')->nullable()->constrained('operators')->nullOnDelete();

            $table->date('handed_over_on');
            $table->string('tender_reference', 64)->nullable();

            // A snapshot of the position at transfer, held even if the
            // underlying records change later.
            $table->jsonb('meter_readings')->nullable();
            $table->unsignedSmallInteger('open_work_orders')->default(0);
            $table->unsignedSmallInteger('overdue_tasks')->default(0);
            $table->jsonb('outstanding')->nullable();

            $table->text('condition_notes')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('organisation_id');
            $table->index(['organisation_id', 'vessel_id', 'handed_over_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vessel_handovers');
    }
};
