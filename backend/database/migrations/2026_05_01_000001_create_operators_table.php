<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The companies and cooperative societies that run the vessels, plus the
 * department's own direct operation.
 *
 * Operators sit inside the organisation rather than being organisations
 * themselves. The department owns the vessels; operators hold them for a tender
 * period. Making each operator a tenant would mean re-stamping the whole
 * maintenance history on every re-tender and orphaning the audit trail.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('operators', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            $table->string('code', 32);
            $table->string('name');
            $table->string('type', 32)->default('cooperative_society');

            $table->string('contact_name')->nullable();
            $table->string('contact_phone', 32)->nullable();
            $table->string('contact_email')->nullable();
            $table->text('address')->nullable();

            $table->string('status', 32)->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['organisation_id', 'code']);
            $table->index('organisation_id');
            $table->index(['organisation_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('operators');
    }
};
