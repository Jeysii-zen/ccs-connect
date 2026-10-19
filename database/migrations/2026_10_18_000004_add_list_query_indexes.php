<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Indexes for the queries that run most: the announcement views and the
 * every-minute scheduled publisher, and the admin account lists. Tables are
 * small today; these keep the queries index-backed as data grows.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            // Scheduled view (orderBy scheduled_at) and
            // announcements:publish-scheduled (scheduled_at <= now).
            $table->index(['announcement_status', 'scheduled_at']);
            // Published view (latest published_at).
            $table->index(['announcement_status', 'published_at']);
        });

        Schema::table('users', function (Blueprint $table) {
            // Account lists (active students/faculty, deactivated by optional role),
            // ordered by name.
            $table->index(['account_status', 'role', 'last_name', 'first_name']);
        });
    }

    public function down(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->dropIndex(['announcement_status', 'scheduled_at']);
            $table->dropIndex(['announcement_status', 'published_at']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['account_status', 'role', 'last_name', 'first_name']);
        });
    }
};
