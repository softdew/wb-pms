<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_rates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            $table->string('activity');
            $table->string('unit', 64);              // per engine, per man-day, per sq.m.
            $table->decimal('rate', 14, 2);
            // Null vendor means an internally applicable rate.
            $table->foreignId('vendor_id')->nullable()->constrained()->nullOnDelete();
            $table->date('valid_from');
            $table->date('valid_to')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->index(['organisation_id', 'vendor_id']);
            $table->index(['organisation_id', 'valid_from', 'valid_to']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_rates');
    }
};
