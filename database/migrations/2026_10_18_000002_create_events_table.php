<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id('event_id');

            $table->foreignId('created_by_user_id')
                ->constrained('users', 'id')
                ->restrictOnDelete();

            $table->foreignId('location_id')
                ->constrained('locations', 'location_id')
                ->restrictOnDelete();

            $table->string('title', 255);
            $table->text('description');
            $table->date('event_date');
            $table->time('start_time');
            $table->time('end_time');
            $table->text('target_participants');
            $table->string('poster_path', 500);
            $table->dateTime('registration_deadline');
            $table->unsignedInteger('max_participants');

            $table->boolean('proof_photo_required')->default(false);
            $table->dateTime('proof_upload_start_at')->nullable();
            $table->dateTime('proof_upload_end_at')->nullable();

            $table->string('event_status', 20)->default('Draft');

            $table->dateTime('created_at');
            $table->dateTime('updated_at');

            $table->index(['event_status', 'event_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
