<?php

namespace App\Http\Requests\Event;

use App\Models\Event;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\Validator;

/**
 * Editing never changes the creator or the lifecycle status: neither is in
 * the rules, so tampered values are dropped from the validated data.
 * Status changes go through the dedicated publish/archive actions.
 */
class UpdateEventRequest extends EventFormRequest
{
    public function authorize(): bool
    {
        $event = $this->route('event');

        return $event instanceof Event
            && ($this->user()?->can('update', $event) ?? false);
    }

    /**
     * Once students have registered, capacity cannot drop below them, and
     * the proof requirement is fixed: each registration's proof status was
     * set from it, and flipping it would strand those statuses.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            ...parent::after(),
            function (Validator $validator): void {
                $event = $this->route('event');

                if (! $event instanceof Event) {
                    return;
                }

                $registered = $event->registrations()->count();

                if ($registered === 0) {
                    return;
                }

                $errors = $validator->errors();

                if (! $errors->has('max_participants') && $this->integer('max_participants') < $registered) {
                    $errors->add(
                        'max_participants',
                        "Max participants cannot be lower than the {$registered} students already registered."
                    );
                }

                if (
                    ! $errors->has('proof_photo_required')
                    && $this->boolean('proof_photo_required') !== $event->proof_photo_required
                ) {
                    $errors->add(
                        'proof_photo_required',
                        'The proof photo requirement cannot change after students have registered.'
                    );
                }
            },
        ];
    }

    /**
     * The replacement poster, or null to keep the current one.
     */
    public function poster(): ?UploadedFile
    {
        $poster = $this->file('poster');

        return $poster instanceof UploadedFile ? $poster : null;
    }

    protected function posterRules(): array
    {
        return ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:15360'];
    }

    protected function storedValue(string $field): ?string
    {
        $event = $this->route('event');

        if (! $event instanceof Event) {
            return null;
        }

        return match ($field) {
            'event_date' => $event->event_date->toDateString(),
            'start_time' => substr($event->start_time, 0, 5),
            'registration_deadline' => $event->registration_deadline->format(self::DATETIME_FORMAT),
            default => null,
        };
    }
}
