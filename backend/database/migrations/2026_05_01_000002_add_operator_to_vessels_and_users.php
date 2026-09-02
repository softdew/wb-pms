<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vessels', function (Blueprint $table) {
            // Who currently runs this vessel. Changes on re-tender; the vessel
            // and its entire history stay where they are.
            $table->foreignId('operator_id')->nullable()->after('ship_type_id')
                ->constrained()->nullOnDelete();
            $table->date('operator_from')->nullable()->after('operator_id');
            $table->date('operator_until')->nullable()->after('operator_from');

            $table->index(['organisation_id', 'operator_id']);
        });

        Schema::table('users', function (Blueprint $table) {
            // Set on the operating company's shared login. Null for department
            // staff and for auditors, who are not tied to one operator.
            $table->foreignId('operator_id')->nullable()->after('organisation_id')
                ->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('operator_id');
        });

        Schema::table('vessels', function (Blueprint $table) {
            $table->dropIndex(['organisation_id', 'operator_id']);
            $table->dropConstrainedForeignId('operator_id');
            $table->dropColumn(['operator_from', 'operator_until']);
        });
    }
};
