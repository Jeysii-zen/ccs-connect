<?php

namespace App\Models;

use App\Enums\EventStatus;
use Database\Factories\EventFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $event_id
 * @property int $created_by_user_id
 * @property int $location_id
 * @property string $title
 * @property string $description
 * @property Carbon $event_date
 * @property string $start_time
 * @property string $end_time
 * @property string $target_participants
 * @property string $poster_path
 * @property Carbon $registration_deadline
 * @property int $max_participants
 * @property bool $proof_photo_required
 * @property Carbon|null $proof_upload_start_at
 * @property Carbon|null $proof_upload_end_at
 * @property string $event_status
 */
class Event extends Model
{
    /** @use HasFactory<EventFactory> */
    use HasFactory;

    protected $primaryKey = 'event_id';

    protected $fillable = [
        'created_by_user_id',
        'location_id',
        'title',
        'description',
        'event_date',
        'start_time',
        'end_time',
        'target_participants',
        'poster_path',
        'registration_deadline',
        'max_participants',
        'proof_photo_required',
        'proof_upload_start_at',
        'proof_upload_end_at',
        'event_status',
    ];

    protected function casts(): array
    {
        return [
            'event_date' => 'date',
            'registration_deadline' => 'datetime',
            'max_participants' => 'integer',
            'proof_photo_required' => 'boolean',
            'proof_upload_start_at' => 'datetime',
            'proof_upload_end_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /**
     * @return BelongsTo<Location, $this>
     */
    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'location_id', 'location_id');
    }

    /**
     * @return HasMany<EventRegistration, $this>
     */
    public function registrations(): HasMany
    {
        return $this->hasMany(EventRegistration::class, 'event_id', 'event_id');
    }

    /**
     * @param  Builder<Event>  $query
     * @return Builder<Event>
     */
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('event_status', EventStatus::PUBLISHED->value);
    }

    /**
     * @param  Builder<Event>  $query
     * @return Builder<Event>
     */
    public function scopeManageableBy(Builder $query, User $user): Builder
    {
        return $query->when(
            $user->role !== 'admin',
            fn (Builder $query) => $query->where('created_by_user_id', $user->id)
        );
    }

    public function isOwnedBy(User $user): bool
    {
        return $this->created_by_user_id === $user->id;
    }

    public function hasStatus(EventStatus $status): bool
    {
        return $this->event_status === $status->value;
    }

    public function startsAt(): Carbon
    {
        return Carbon::parse("{$this->event_date->toDateString()} {$this->start_time}");
    }

    public function endsAt(): Carbon
    {
        return Carbon::parse("{$this->event_date->toDateString()} {$this->end_time}");
    }

    /**
     * Where the proof-photo upload window stands at $now (default: now):
     * not_required, upcoming, open or closed.
     */
    public function proofWindowState(?Carbon $now = null): string
    {
        if (! $this->proof_photo_required
            || $this->proof_upload_start_at === null
            || $this->proof_upload_end_at === null) {
            return 'not_required';
        }

        $now ??= now();

        return match (true) {
            $now->lessThan($this->proof_upload_start_at) => 'upcoming',
            $now->greaterThan($this->proof_upload_end_at) => 'closed',
            default => 'open',
        };
    }

    /**
     * Display lifecycle (questionnaire Q23):
     * Draft → Published (Open → Full/Closed → Ongoing → Completed) → Archived.
     *
     * Only Draft, Published and Archived are stored; the published phases are
     * derived so they never go stale. Callers pass the registered count
     * (e.g. from withCount('registrations')) so Full can be detected.
     */
    public function lifecycleStatus(int $registeredCount = 0): string
    {
        if (! $this->hasStatus(EventStatus::PUBLISHED)) {
            return $this->event_status;
        }

        $now = now();

        return match (true) {
            $now->greaterThanOrEqualTo($this->endsAt()) => 'Completed',
            $now->greaterThanOrEqualTo($this->startsAt()) => 'Ongoing',
            $registeredCount >= $this->max_participants => 'Full',
            $now->greaterThan($this->registration_deadline) => 'Closed',
            default => 'Open',
        };
    }
}
