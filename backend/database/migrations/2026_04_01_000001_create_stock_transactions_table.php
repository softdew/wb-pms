<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The stock ledger.
 *
 * parts.stock_qty stays as a running figure for fast lookups, but it is now
 * derived: every movement is a row here. A scalar alone cannot answer what a
 * work order consumed, who adjusted stock last March, or reconcile against a
 * physical count -- the same reason meter readings needed history.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('part_id')->constrained()->cascadeOnDelete();
            $table->foreignId('work_order_id')->nullable();
            $table->foreignId('location_id')->nullable()->constrained()->nullOnDelete();

            $table->string('type', 32);

            // Signed. Positive adds to stock, negative removes. Storing the
            // sign rather than deriving it keeps an adjustment unambiguous.
            $table->decimal('quantity', 14, 3);
            $table->decimal('balance_after', 14, 3);
            $table->decimal('unit_cost', 14, 2)->nullable();

            $table->string('reference_no', 64)->nullable();
            $table->date('transacted_on');
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->index('organisation_id');
            $table->index(['organisation_id', 'part_id', 'transacted_on']);
            $table->index(['organisation_id', 'work_order_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_transactions');
    }
};
