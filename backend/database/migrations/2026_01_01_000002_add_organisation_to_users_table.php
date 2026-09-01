<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Null only for platform administrators, who sit above the tenants.
            $table->foreignId('organisation_id')->nullable()->after('id')
                ->constrained()->restrictOnDelete();
            $table->boolean('is_platform_admin')->default(false)->after('organisation_id');
            $table->string('employee_code', 64)->nullable()->after('name');
            $table->foreignId('trade_id')->nullable()->after('employee_code');
            $table->string('status', 32)->default('active');
            $table->timestamp('last_login_at')->nullable();

            $table->unique(['organisation_id', 'employee_code']);
            $table->index(['organisation_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['organisation_id', 'employee_code']);
            $table->dropIndex(['organisation_id', 'status']);
            $table->dropConstrainedForeignId('organisation_id');
            $table->dropColumn(['is_platform_admin', 'employee_code', 'trade_id', 'status', 'last_login_at']);
        });
    }
};
