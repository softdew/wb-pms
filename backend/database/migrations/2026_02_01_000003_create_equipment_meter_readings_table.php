<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equipment_meter_readings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('equipment_id')->constrained()->cascadeOnDelete();

            $table->string('meter_type', 32);
            $table->decimal('reading_value', 14, 2);
            $table->date('reading_on');

            // A replaced or rolled-over meter legitimately reads lower than the
            // one before it. Without this flag that is indistinguishable from
            // a typo, so it must be declared.
            $table->boolean('is_reset')->default(false);
            $table->decimal('previous_value', 14, 2)->nullable();

            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->index(['organisation_id', 'equipment_id', 'reading_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equipment_meter_readings');
    }
};
