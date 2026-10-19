<?php

namespace Database\Seeders;

use App\Models\Location;
use Illuminate\Database\Seeder;

/**
 * Predefined campus locations (ERD requirements questionnaire Q34:
 * "Locations are predefined and developers configure them").
 *
 * Event forms list exactly these rows. Re-running the seeder updates
 * existing rows by location_name.
 */
class LocationSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->locations() as $location) {
            Location::query()->updateOrCreate(
                ['location_name' => $location['location_name']],
                $location
            );
        }
    }

    /**
     * Approved CCS locations only. Leave a detail null until it is confirmed.
     *
     * @return list<array{location_name: string, description?: string|null, building?: string|null, floor?: string|null, room_number?: string|null}>
     */
    private function locations(): array
    {
        return [
            [
                'location_name' => 'Palma Hall',
                'description' => null,
                'building' => null,
                'floor' => null,
                'room_number' => null,
            ],
        ];
    }
}
