<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('announcements', function (Blueprint $table) {
            $table->id('announcement_id');

            $table->foreignId('created_by_user_id')
                ->constrained('users', 'id')
                ->restrictOnDelete();

            $table->string('title', 255);
            $table->text('description_content');
            $table->date('announcement_date');

            $table->string('announcement_status', 15)
                ->default('Draft');

            $table->dateTime('published_at')->nullable();

            $table->dateTime('created_at');
            $table->dateTime('updated_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcements');
    }
};
