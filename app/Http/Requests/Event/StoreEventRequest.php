<?php

namespace App\Http\Requests\Event;

use App\Enums\EventStatus;
use App\Models\Event;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StoreEventRequest extends EventFormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Event::class) ?? false;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),

            // New events start as drafts unless "Save and publish" is chosen.
            'event_status' => [
                'sometimes',
                Rule::in([EventStatus::DRAFT->value, EventStatus::PUBLISHED->value]),
            ],
        ];
    }

    /**
     * The validated poster upload (required on create).
     */
    public function poster(): UploadedFile
    {
        $poster = $this->file('poster');

        if (! $poster instanceof UploadedFile) {
            throw ValidationException::withMessages([
                'poster' => 'Upload a poster or image for the event.',
            ]);
        }

        return $poster;
    }

    protected function posterRules(): array
    {
        return ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:15360'];
    }

    protected function storedValue(string $field): ?string
    {
        return null;
    }
}
