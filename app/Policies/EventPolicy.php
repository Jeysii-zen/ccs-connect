<?php

namespace App\Policies;

use App\Models\Event;
use App\Models\User;

/**
 * Ownership rules for event management (SSD4): Admin manages every event,
 * Faculty only the events they created. Lifecycle rules (what may be
 * edited, published or archived in each state) live in EventService.
 */
class EventPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->isManager($user);
    }

    public function view(User $user, Event $event): bool
    {
        return $this->manages($user, $event);
    }

    public function create(User $user): bool
    {
        return $this->isManager($user);
    }

    public function update(User $user, Event $event): bool
    {
        return $this->manages($user, $event);
    }

    public function publish(User $user, Event $event): bool
    {
        return $this->manages($user, $event);
    }

    public function archive(User $user, Event $event): bool
    {
        return $this->manages($user, $event);
    }

    public function delete(User $user, Event $event): bool
    {
        return $this->manages($user, $event);
    }

    /**
     * Only students register (questionnaire Q21/Q26). Whether the event
     * is open is a lifecycle rule checked by RegistrationService.
     */
    public function register(User $user, Event $event): bool
    {
        return $user->role === 'student';
    }

    private function isManager(User $user): bool
    {
        return in_array($user->role, ['admin', 'faculty'], true);
    }

    public function manages(User $user, Event $event): bool
    {
        return $user->role === 'admin'
            || ($user->role === 'faculty' && $event->isOwnedBy($user));
    }
}
