<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('locations', function (Blueprint $table) {
            $table->id('location_id');

            $table->string('location_name', 255)->unique();
            $table->text('description')->nullable();
            $table->string('building', 150)->nullable();
            $table->string('floor', 30)->nullable();
            $table->string('room_number', 30)->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('locations');
    }
};
