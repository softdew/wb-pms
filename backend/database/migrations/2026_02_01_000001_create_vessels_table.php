<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vessels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ship_type_id')->nullable()->constrained()->nullOnDelete();
            $table->string('code', 32);
            $table->string('name');
            $table->string('registration_no', 64)->nullable();
            $table->string('official_no', 64)->nullable();
            $table->date('commission_date')->nullable();
            $table->string('operating_zone', 32)->nullable();

            // The vessel in-charge or chief engineer named on the client's
            // monthly maintenance return.
            $table->foreignId('incharge_user_id')->nullable()
                ->constrained('users')->nullOnDelete();

            $table->string('status', 32)->default('active');
            $table->text('remarks')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['organisation_id', 'code']);
            $table->index(['organisation_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vessels');
    }
};
