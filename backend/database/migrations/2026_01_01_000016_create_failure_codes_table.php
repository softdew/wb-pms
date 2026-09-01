<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The four mandatory close-out code sets, held in one table keyed by
        // type so a new set can be added without a migration.
        Schema::create('failure_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            // failure_mode | cause | detection_method | severity
            $table->string('type', 32);
            $table->string('code', 32);
            $table->string('description');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['organisation_id', 'type', 'code']);
            $table->index(['organisation_id', 'type', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('failure_codes');
    }
};
