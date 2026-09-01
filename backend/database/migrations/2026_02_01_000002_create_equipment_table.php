<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equipment', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();

            // Self-referencing hierarchy. Depth actually used is a
            // configuration decision, not a schema one.
            $table->foreignId('parent_id')->nullable()
                ->constrained('equipment')->nullOnDelete();
            $table->string('taxonomy_level', 32)->nullable();

            // Equipment sits either on a vessel or at a shore location.
            // Enforced by a check constraint below.
            $table->foreignId('vessel_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('location_id')->nullable()->constrained()->nullOnDelete();

            $table->foreignId('equipment_category_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('equipment_model_id')->nullable()->constrained()->nullOnDelete();

            $table->string('code', 64);
            $table->string('name');
            $table->string('serial_no', 128)->nullable();
            $table->date('installation_date')->nullable();
            $table->date('last_renewal_date')->nullable();
            $table->date('warranty_expiry_date')->nullable();
            $table->string('duty_status', 32)->default('duty');

            // Meter definition. Null means the asset is not metered and can
            // only carry calendar, condition, event or statutory triggers.
            $table->string('meter_type', 32)->nullable();
            $table->decimal('current_meter_reading', 14, 2)->nullable();
            $table->date('current_meter_reading_on')->nullable();

            $table->string('statutory_item_ref', 128)->nullable();
            $table->decimal('replacement_value', 16, 2)->nullable();

            // Current criticality. The authoritative history lives in
            // criticality_assessments; these are written only on approval and
            // exist so the register can be filtered and reported on cheaply.
            $table->unsignedTinyInteger('criticality_c')->nullable();
            $table->unsignedTinyInteger('criticality_e')->nullable();
            $table->unsignedTinyInteger('criticality_r')->nullable();
            $table->unsignedSmallInteger('criticality_index')->nullable();
            $table->string('criticality_band', 16)->nullable();
            $table->timestamp('criticality_approved_at')->nullable();
            $table->foreignId('criticality_approved_by')->nullable()
                ->constrained('users')->nullOnDelete();

            $table->string('maintenance_strategy', 48)->nullable();

            // Set where loss of function is not evident to the operating crew:
            // bilge alarms, fire detection, emergency steering, e-stops.
            // Blocks run-to-failure and, later, interval extension.
            $table->boolean('hidden_failure_flag')->default(false);

            // The four admissibility conditions for run-to-failure. All must be
            // affirmed before that strategy can be assigned.
            $table->boolean('rtf_consequence_tolerable')->default(false);
            $table->boolean('rtf_failure_evident')->default(false);
            $table->boolean('rtf_spare_held_or_cheap')->default(false);
            $table->boolean('rtf_no_statutory_requirement')->default(false);

            $table->string('status', 32)->default('active');
            $table->text('remarks')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['organisation_id', 'code']);
            $table->index(['organisation_id', 'vessel_id']);
            $table->index(['organisation_id', 'location_id']);
            $table->index(['organisation_id', 'parent_id']);
            $table->index(['organisation_id', 'criticality_band']);
            $table->index(['organisation_id', 'equipment_category_id']);
        });

        // An asset with neither a vessel nor a location is unreachable: it
        // cannot be found, planned or worked on. Reject it at the database.
        DB::statement('
            alter table equipment
            add constraint equipment_has_a_home
            check (vessel_id is not null or location_id is not null)
        ');
    }

    public function down(): void
    {
        Schema::dropIfExists('equipment');
    }
};
