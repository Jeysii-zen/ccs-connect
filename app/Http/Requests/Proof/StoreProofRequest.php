<?php

namespace App\Http\Requests\Proof;

use App\Models\EventRegistration;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

/**
 * Proof photo upload. The requirements ask for a selfie with the event in
 * the background (User Workflow), so only images are accepted; type and
 * size limits follow the existing announcement/event image uploads.
 */
class StoreProofRequest extends FormRequest
{
    public function authorize(): bool
    {
        $registration = $this->route('registration');

        return $registration instanceof EventRegistration
            && ($this->user()?->can('submitProof', $registration) ?? false);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:15360'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'photo.required' => 'Choose a proof photo to upload.',
            'photo.image' => 'The proof must be a photo.',
            'photo.mimes' => 'The proof photo must be a JPG, PNG or WEBP image.',
            'photo.max' => 'The proof photo must not be larger than 15 MB.',
        ];
    }

    public function photo(): UploadedFile
    {
        $photo = $this->file('photo');

        if (! $photo instanceof UploadedFile) {
            throw ValidationException::withMessages(['photo' => 'Choose a proof photo to upload.']);
        }

        return $photo;
    }
}
