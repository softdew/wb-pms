<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            $table->string('code', 64);
            $table->string('name');
            $table->foreignId('part_category_id')->nullable()->constrained()->nullOnDelete();
            $table->string('oem_reference', 128)->nullable();
            $table->string('uom', 16)->default('nos');
            $table->decimal('unit_cost', 14, 2)->nullable();

            // Stock is held as a running figure on the part and reconciled from
            // stock transactions in Block 3. Reorder level is mandatory for
            // run-to-failure items -- enforced in the application layer.
            $table->decimal('stock_qty', 14, 3)->default(0);
            $table->decimal('reorder_level', 14, 3)->nullable();

            // Drives how far ahead of the due date a work order is released.
            $table->unsignedSmallInteger('lead_time_days')->default(0);

            $table->foreignId('location_id')->nullable()->constrained()->nullOnDelete();
            $table->string('image_path')->nullable();
            $table->text('remarks')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['organisation_id', 'code']);
            $table->index(['organisation_id', 'part_category_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parts');
    }
};
