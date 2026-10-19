<?php

namespace App\Policies;

use App\Models\EventRegistration;
use App\Models\User;

/**
 * Students act only on their own registration; proof is reviewed by the
 * event's managers (questionnaire Q29, SSD4: Faculty for the events they
 * created, Admin for every event).
 */
class EventRegistrationPolicy
{
    public function __construct(
        private readonly EventPolicy $eventPolicy
    ) {}

    public function submitProof(User $user, EventRegistration $registration): bool
    {
        return $user->role === 'student' && $registration->isOwnedBy($user);
    }

    /**
     * The proof photo is private: its owner and the event's managers only.
     */
    public function viewProof(User $user, EventRegistration $registration): bool
    {
        return $registration->isOwnedBy($user)
            || $this->eventPolicy->manages($user, $registration->event);
    }

    public function reviewProof(User $user, EventRegistration $registration): bool
    {
        return $this->eventPolicy->manages($user, $registration->event);
    }

    /**
     * Faculty for their own events, Admin for all (questionnaire Q33).
     */
    public function modifyAttendance(User $user, EventRegistration $registration): bool
    {
        return $this->eventPolicy->manages($user, $registration->event);
    }
}
