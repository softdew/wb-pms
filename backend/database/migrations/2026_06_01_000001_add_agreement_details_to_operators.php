<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Operators hold vessels under a tender for three to five years, so the
 * agreement is a fact about the operator worth recording alongside them.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('operators', function (Blueprint $table) {
            $table->string('agreement_no', 64)->nullable()->after('type');
            $table->string('tender_reference', 64)->nullable()->after('agreement_no');
            $table->date('agreement_from')->nullable()->after('tender_reference');
            $table->date('agreement_to')->nullable()->after('agreement_from');
            $table->string('contact_designation', 128)->nullable()->after('contact_name');
            $table->text('remarks')->nullable()->after('address');
        });
    }

    public function down(): void
    {
        Schema::table('operators', function (Blueprint $table) {
            $table->dropColumn([
                'agreement_no', 'tender_reference', 'agreement_from',
                'agreement_to', 'contact_designation', 'remarks',
            ]);
        });
    }
};
