<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_registrations', function (Blueprint $table) {
            $table->id('registration_id');

            // Deleting an event removes its registrations; archiving keeps
            // them (questionnaire Q42).
            $table->foreignId('event_id')
                ->constrained('events', 'event_id')
                ->cascadeOnDelete();

            // Accounts are anonymized, not deleted, so history is kept (Q12).
            $table->foreignId('user_id')
                ->constrained('users', 'id')
                ->restrictOnDelete();

            $table->string('year_level_at_registration', 20);
            $table->string('block_at_registration', 20);
            $table->dateTime('registered_at');

            $table->string('proof_status', 20);
            $table->string('proof_photo_path', 500)->nullable();
            $table->dateTime('proof_uploaded_at')->nullable();

            $table->foreignId('proof_reviewed_by_user_id')
                ->nullable()
                ->constrained('users', 'id')
                ->nullOnDelete();

            $table->dateTime('proof_reviewed_at')->nullable();
            $table->text('proof_rejection_reason')->nullable();

            $table->dateTime('qr_checked_in_at')->nullable();
            $table->string('attendance_status', 15);
            $table->dateTime('attended_at')->nullable();

            $table->foreignId('attendance_modified_by_user_id')
                ->nullable()
                ->constrained('users', 'id')
                ->nullOnDelete();

            $table->dateTime('attendance_modified_at')->nullable();

            // One registration per student per event, also under races.
            $table->unique(['event_id', 'user_id']);
            $table->index(['event_id', 'proof_status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_registrations');
    }
};
