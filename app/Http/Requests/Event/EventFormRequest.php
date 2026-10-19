<?php

namespace App\Http\Requests\Event;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Shared validation for creating and editing events.
 *
 * Dates arrive in the app timezone (Asia/Manila): event_date as Y-m-d,
 * times as H:i, and the deadline/proof window as Y-m-d\TH:i
 * (datetime-local inputs).
 */
abstract class EventFormRequest extends FormRequest
{
    protected const DATETIME_FORMAT = 'Y-m-d\TH:i';

    /** How boundaries are shown in error messages, e.g. "Nov 20, 2026 9:00 AM". */
    private const DISPLAY_FORMAT = 'M j, Y g:i A';

    private const TIME_FIELDS = ['start_time', 'end_time'];

    private const DATETIME_FIELDS = [
        'registration_deadline',
        'proof_upload_start_at',
        'proof_upload_end_at',
    ];

    /**
     * Rules for the poster upload; required on create, optional on edit.
     *
     * @return array<int, mixed>
     */
    abstract protected function posterRules(): array;

    /**
     * The stored value of a schedule field, or null when creating. A field
     * that keeps its stored value is not re-checked against "now", so a
     * past event can still have its description corrected.
     */
    abstract protected function storedValue(string $field): ?string;

    /**
     * Some browsers (notably Safari) send time and datetime-local values
     * with seconds ("17:00:00"). The schedule works to the minute, so drop
     * them instead of failing date_format.
     */
    protected function prepareForValidation(): void
    {
        $normalized = [];

        foreach ([...self::TIME_FIELDS, ...self::DATETIME_FIELDS] as $field) {
            $value = $this->input($field);

            if (
                is_string($value)
                && preg_match('/^((?:\d{4}-\d{2}-\d{2}T)?\d{2}:\d{2}):\d{2}(?:\.\d+)?$/', $value, $matches)
            ) {
                $normalized[$field] = $matches[1];
            }
        }

        $this->merge($normalized);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:10000'],
            'event_date' => ['required', 'date_format:Y-m-d'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],

            'location_id' => [
                'required',
                'integer',
                Rule::exists('locations', 'location_id'),
            ],

            'target_participants' => ['required', 'string', 'max:1000'],
            'max_participants' => ['required', 'integer', 'min:1', 'max:100000'],
            'registration_deadline' => ['required', 'date_format:'.self::DATETIME_FORMAT],
            'poster' => $this->posterRules(),

            'proof_photo_required' => ['required', 'boolean'],

            // Only kept when proof is required; otherwise dropped from the
            // validated data so stale window values are never stored.
            'proof_upload_start_at' => [
                'exclude_unless:proof_photo_required,true',
                'required',
                'date_format:'.self::DATETIME_FORMAT,
            ],
            'proof_upload_end_at' => [
                'exclude_unless:proof_photo_required,true',
                'required',
                'date_format:'.self::DATETIME_FORMAT,
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'end_time.after' => 'The end time must be after the start time.',
            'location_id.exists' => 'Select one of the listed locations.',
            'poster.required' => 'Upload a poster or image for the event.',
            'poster.max' => 'The poster must not be larger than 15 MB.',
            'proof_upload_start_at.required' => 'Set when proof photo uploads open.',
            'proof_upload_end_at.required' => 'Set when proof photo uploads close.',
        ];
    }

    /**
     * Cross-field schedule rules, run once the individual formats pass.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $errors = $validator->errors();

                if ($errors->hasAny(['event_date', 'start_time', 'end_time'])) {
                    return;
                }

                $startsAt = $this->moment(
                    "{$this->input('event_date')} {$this->input('start_time')}",
                    'Y-m-d H:i'
                );

                if (
                    ($this->changed('event_date') || $this->changed('start_time'))
                    && $startsAt->lessThanOrEqualTo(now())
                ) {
                    $errors->add('event_date', 'The event must start in the future.');
                }

                if (! $errors->has('registration_deadline')) {
                    $deadline = $this->moment($this->string('registration_deadline')->toString());

                    // Messages name the boundary, so the user can see what
                    // the deadline was compared with.
                    if ($deadline->greaterThan($startsAt)) {
                        $errors->add(
                            'registration_deadline',
                            'The registration deadline must be on or before the event start ('
                                .$startsAt->format(self::DISPLAY_FORMAT).').'
                        );
                    } elseif (
                        $this->changed('registration_deadline')
                        && $deadline->lessThanOrEqualTo(now())
                    ) {
                        $errors->add(
                            'registration_deadline',
                            'The registration deadline must be in the future (it is now '
                                .now()->format(self::DISPLAY_FORMAT).').'
                        );
                    }
                }

                if (
                    ! $this->boolean('proof_photo_required')
                    || $errors->hasAny(['proof_upload_start_at', 'proof_upload_end_at'])
                ) {
                    return;
                }

                $proofStart = $this->moment($this->string('proof_upload_start_at')->toString());
                $proofEnd = $this->moment($this->string('proof_upload_end_at')->toString());

                // The proof is a photo taken at the event (User Workflow), so
                // uploads cannot open before it starts.
                if ($proofStart->lessThan($startsAt)) {
                    $errors->add(
                        'proof_upload_start_at',
                        'Proof uploads cannot open before the event starts.'
                    );
                }

                if ($proofEnd->lessThanOrEqualTo($proofStart)) {
                    $errors->add(
                        'proof_upload_end_at',
                        'Proof uploads must close after they open.'
                    );
                }
            },
        ];
    }

    private function changed(string $field): bool
    {
        $stored = $this->storedValue($field);

        return $stored === null || $stored !== $this->input($field);
    }

    private function moment(string $value, string $format = self::DATETIME_FORMAT): Carbon
    {
        $moment = Carbon::createFromFormat($format, $value, config('app.timezone'));

        if (! $moment instanceof Carbon) {
            throw new \InvalidArgumentException("Invalid date: {$value}");
        }

        return $moment->second(0);
    }
}
