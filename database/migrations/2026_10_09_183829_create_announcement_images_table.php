<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('announcement_images', function (Blueprint $table) {
            $table->id('announcement_image_id');

            $table->foreignId('announcement_id')
                ->constrained('announcements', 'announcement_id')
                ->cascadeOnDelete();

            $table->string('image_path', 500);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcement_images');
    }
};
