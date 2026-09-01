<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('maintenance_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->unique()->constrained()->cascadeOnDelete();

            // The amber window, as a percentage of the interval remaining.
            // On the client's Main Engine sheet a task with 200 of 250 hrs
            // consumed reads "soon", while 1800 of 5000 remaining reads "ok",
            // which puts their threshold somewhere between 20 and 36 per cent.
            $table->unsignedTinyInteger('warning_threshold_percent')->default(25);

            // Fallback used where a plan line carries no lead time of its own.
            $table->unsignedSmallInteger('default_release_lead_days')->default(7);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maintenance_settings');
    }
};
