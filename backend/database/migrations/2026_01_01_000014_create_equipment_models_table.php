<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equipment_models', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('equipment_category_id')->nullable()
                ->constrained()->nullOnDelete();
            $table->string('make', 128);
            $table->string('model', 128);
            $table->string('oem', 128)->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['organisation_id', 'make', 'model']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equipment_models');
    }
};
