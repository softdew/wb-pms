<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The anchored points of the C, E and R scales. Held as data so the
        // wording can be recalibrated without a deployment.
        Schema::create('criticality_scale_points', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            $table->string('factor', 1);          // C | E | R
            $table->unsignedTinyInteger('value'); // C,E: 1-5   R: 1-3
            $table->string('label', 64);
            $table->text('anchor')->nullable();
            $table->timestamps();

            $table->unique(['organisation_id', 'factor', 'value']);
        });

        // One row per organisation. Band thresholds are configurable; the
        // defaults come from the maintenance logic issued by the client.
        Schema::create('criticality_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('high_threshold')->default(30);   // index >= this  => High
            $table->unsignedSmallInteger('medium_threshold')->default(12); // index >= this  => Medium
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('criticality_settings');
        Schema::dropIfExists('criticality_scale_points');
    }
};
