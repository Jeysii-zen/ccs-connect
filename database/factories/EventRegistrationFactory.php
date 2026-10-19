<?php

namespace Database\Factories;

use App\Enums\AttendanceStatus;
use App\Enums\ProofStatus;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EventRegistration>
 */
class EventRegistrationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'event_id' => Event::factory()->published(),
            'user_id' => User::factory()->state([
                'role' => 'student',
                'year_level' => '3',
                'block_number' => '2',
            ]),
            'year_level_at_registration' => '3',
            'block_at_registration' => '2',
            'registered_at' => now(),
            'proof_status' => ProofStatus::NOT_REQUIRED->value,
            'attendance_status' => AttendanceStatus::PENDING->value,
        ];
    }

    /**
     * Proof required, nothing uploaded yet.
     */
    public function awaitingProof(): static
    {
        return $this->state(['proof_status' => ProofStatus::PENDING->value]);
    }

    /**
     * Proof uploaded and waiting for review.
     */
    public function submitted(string $path = 'proofs/test-proof.png'): static
    {
        return $this->state([
            'proof_status' => ProofStatus::PENDING->value,
            'proof_photo_path' => $path,
            'proof_uploaded_at' => now(),
        ]);
    }
}
