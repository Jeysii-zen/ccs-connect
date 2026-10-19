<?php

namespace App\Enums;

/**
 * Persisted event states (events.event_status).
 *
 * Registration openness, fullness, ongoing and completed are derived from
 * the event's deadline, capacity and schedule; see Event::lifecycleStatus().
 */
enum EventStatus: string
{
    case DRAFT = 'Draft';
    case PUBLISHED = 'Published';
    case ARCHIVED = 'Archived';
}
