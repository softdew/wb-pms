<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Who held a vessel, and when.
 *
 * vessels.operator_id answers "who runs it now". This answers "who ran it in
 * March 2027", which is the question the department will actually ask when
 * comparing operators across tenders. Without it, reassigning a vessel silently
 * reattributes its entire past to whoever holds it today.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vessel_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('vessel_id')->constrained()->cascadeOnDelete();
            $table->foreignId('operator_id')->constrained()->cascadeOnDelete();

            $table->date('assigned_from');
            $table->date('assigned_until')->nullable(); // null means current

            $table->string('agreement_no', 64)->nullable();
            $table->string('tender_reference', 64)->nullable();
            $table->foreignId('vessel_incharge_id')->nullable()
                ->constrained('vessel_incharges')->nullOnDelete();

            $table->text('remarks')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('organisation_id');
            $table->index(['organisation_id', 'vessel_id', 'assigned_from']);
            $table->index(['organisation_id', 'operator_id']);
        });

        Schema::table('vessels', function (Blueprint $table) {
            // The current in-charge, mirrored for cheap reads. The authoritative
            // record of who held the vessel when is vessel_assignments.
            $table->foreignId('vessel_incharge_id')->nullable()->after('incharge_user_id')
                ->constrained('vessel_incharges')->nullOnDelete();
        });

        Schema::table('work_orders', function (Blueprint $table) {
            // Stamped when the work order is raised, so the job stays attributed
            // to whoever held the vessel at the time even after a re-tender.
            $table->foreignId('operator_id')->nullable()->after('equipment_id')
                ->constrained()->nullOnDelete();
            $table->index(['organisation_id', 'operator_id']);
        });
    }

    public function down(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropIndex(['organisation_id', 'operator_id']);
            $table->dropConstrainedForeignId('operator_id');
        });

        Schema::table('vessels', function (Blueprint $table) {
            $table->dropConstrainedForeignId('vessel_incharge_id');
        });

        Schema::dropIfExists('vessel_assignments');
    }
};
