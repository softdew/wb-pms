<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The person in charge of a vessel, maintained by the operator that employs
 * them.
 *
 * These are records, not logins. Operators hold one shared account for now, so
 * naming the actual chief engineer has to be data rather than a user. The
 * nullable user_id is there for the day individual logins arrive, so that
 * change is a link rather than a restructure.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vessel_incharges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('operator_id')->constrained()->cascadeOnDelete();

            $table->string('name');
            $table->string('designation', 128)->nullable();

            // Competency certificate under the Inland Vessels Act and the
            // applicable State Inland Vessel Rules.
            $table->string('licence_no', 64)->nullable();
            $table->string('licence_type', 64)->nullable();
            $table->date('licence_issued_on')->nullable();
            $table->date('licence_valid_until')->nullable();
            $table->string('licence_issuing_authority', 128)->nullable();

            $table->string('phone', 32)->nullable();
            $table->string('email')->nullable();

            // Set only if this person is later given their own account.
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

            $table->string('status', 32)->default('active');
            $table->text('remarks')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('organisation_id');
            $table->index(['organisation_id', 'operator_id', 'status']);
            $table->index(['organisation_id', 'licence_valid_until']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vessel_incharges');
    }
};
