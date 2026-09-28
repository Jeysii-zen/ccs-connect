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
            $table->string('first_name', 100)
                ->after('id');

            $table->string('last_name', 100)
                ->after('first_name');

            $table->string('profile_picture_path', 500)
                ->nullable()
                ->after('last_name');

            $table->string('role', 20)
                ->after('profile_picture_path');

            $table->string('year_level', 20)
                ->nullable()
                ->after('role');

            $table->string('block_number', 20)
                ->nullable()
                ->after('year_level');

            $table->string('account_status', 25)
                ->after('block_number');

            $table->integer('failed_login_attempts')
                ->default(0)
                ->after('email_verified_at');

            $table->dateTime('login_cooldown_until')
                ->nullable()
                ->after('failed_login_attempts');

            $table->dateTime('deactivated_at')
                ->nullable()
                ->after('login_cooldown_until');

            $table->dateTime('anonymized_at')
                ->nullable()
                ->after('deactivated_at');

            $table->dropColumn('name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('name')->nullable()->after('id');

            $table->dropColumn([
                'first_name',
                'last_name',
                'profile_picture_path',
                'role',
                'year_level',
                'block_number',
                'account_status',
                'failed_login_attempts',
                'login_cooldown_until',
                'deactivated_at',
                'anonymized_at',
            ]);
        });
    }
};