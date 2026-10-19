<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\Rule;

/**
 * What users may change about themselves: their email and profile picture.
 *
 * Name, student number / faculty ID, year level and block are official
 * records kept by the CCS administrator. They are not in the rules, so any
 * such values sent with the request are dropped from the validated data.
 */
class ProfileUpdateRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class)->ignore($this->user()?->id),
            ],
            'profile_picture' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'remove_profile_picture' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'profile_picture.image' => 'The profile picture must be a photo.',
            'profile_picture.mimes' => 'The profile picture must be a JPG, PNG or WEBP image.',
            'profile_picture.max' => 'The profile picture must not be larger than 5 MB.',
        ];
    }

    public function profilePicture(): ?UploadedFile
    {
        $file = $this->file('profile_picture');

        return $file instanceof UploadedFile ? $file : null;
    }
}
