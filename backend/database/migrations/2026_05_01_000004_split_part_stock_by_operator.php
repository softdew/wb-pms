<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Splits the catalogue from the stock.
 *
 * parts becomes the department's catalogue: what a thing is, its OEM reference,
 * its unit and its lead time. Read-only to operators.
 *
 * part_stocks holds what each operator has on hand. Spares are on the
 * contractor's account, so quantities, reorder levels and storage locations
 * belong to the operator, not to the department.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('part_stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('operator_id')->constrained()->cascadeOnDelete();
            $table->foreignId('part_id')->constrained()->cascadeOnDelete();

            $table->decimal('stock_qty', 14, 3)->default(0);
            $table->decimal('reorder_level', 14, 3)->nullable();
            $table->foreignId('location_id')->nullable()->constrained()->nullOnDelete();
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->unique(['operator_id', 'part_id']);
            $table->index('organisation_id');
            $table->index(['organisation_id', 'operator_id']);
        });

        Schema::table('stock_transactions', function (Blueprint $table) {
            $table->foreignId('operator_id')->nullable()->after('organisation_id')
                ->constrained()->cascadeOnDelete();
            $table->index(['organisation_id', 'operator_id', 'part_id']);
        });

        // Stock leaves the catalogue.
        Schema::table('parts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('location_id');
            $table->dropColumn(['stock_qty', 'reorder_level']);
        });
    }

    public function down(): void
    {
        Schema::table('parts', function (Blueprint $table) {
            $table->decimal('stock_qty', 14, 3)->default(0);
            $table->decimal('reorder_level', 14, 3)->nullable();
            $table->foreignId('location_id')->nullable()->constrained()->nullOnDelete();
        });

        Schema::table('stock_transactions', function (Blueprint $table) {
            $table->dropIndex(['organisation_id', 'operator_id', 'part_id']);
            $table->dropConstrainedForeignId('operator_id');
        });

        Schema::dropIfExists('part_stocks');
    }
};
