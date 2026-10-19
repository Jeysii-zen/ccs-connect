<?php

namespace Database\Factories;

use App\Models\Location;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Test-only locations. Real locations come from LocationSeeder.
 *
 * @extends Factory<Location>
 */
class LocationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'location_name' => 'Test Location '.fake()->unique()->numberBetween(1, 99999),
            'description' => null,
            'building' => null,
            'floor' => null,
            'room_number' => null,
        ];
    }
}
