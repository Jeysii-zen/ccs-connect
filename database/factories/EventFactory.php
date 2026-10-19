<?php

namespace Database\Factories;

use App\Enums\EventStatus;
use App\Models\Event;
use App\Models\Location;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Event>
 */
class EventFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $date = now()->addDays(14)->startOfDay();

        return [
            'created_by_user_id' => User::factory()->state(['role' => 'faculty']),
            'location_id' => Location::factory(),
            'title' => fake()->sentence(4),
            'description' => fake()->paragraph(),
            'event_date' => $date->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'target_participants' => 'All CCS students',
            'poster_path' => 'events/test-poster.jpg',
            'registration_deadline' => $date->copy()->subDays(2)->setTime(17, 0),
            'max_participants' => 100,
            'proof_photo_required' => false,
            'proof_upload_start_at' => null,
            'proof_upload_end_at' => null,
            'event_status' => EventStatus::DRAFT->value,
        ];
    }

    public function published(): static
    {
        return $this->state(['event_status' => EventStatus::PUBLISHED->value]);
    }

    public function archived(): static
    {
        return $this->state(['event_status' => EventStatus::ARCHIVED->value]);
    }
}
