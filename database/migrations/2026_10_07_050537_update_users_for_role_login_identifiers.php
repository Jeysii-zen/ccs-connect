<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('faculty_id', 20)
                ->nullable()
                ->unique()
                ->after('student_number');

            $table->string('email')
                ->nullable()
                ->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['faculty_id']);
            $table->dropColumn('faculty_id');

            $table->string('email')
                ->nullable(false)
                ->change();
        });
    }
};
