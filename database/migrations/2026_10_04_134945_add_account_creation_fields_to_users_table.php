<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('middle_name', 100)
                ->nullable()
                ->after('first_name');

            $table->string('suffix', 20)
                ->nullable()
                ->after('last_name');

            $table->string('employment_type', 20)
                ->nullable()
                ->after('role');

            $table->unique('student_number');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['student_number']);

            $table->dropColumn([
                'middle_name',
                'suffix',
                'employment_type',
            ]);
        });
    }
};
