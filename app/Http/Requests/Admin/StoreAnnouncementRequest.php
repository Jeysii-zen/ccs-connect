<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAnnouncementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],

            'description_content' => ['required', 'string'],

            'announcement_status' => [
                'sometimes',
                Rule::in(['Draft', 'Published', 'Scheduled']),
            ],

            'scheduled_at' => [
                'nullable',
                'required_if:announcement_status,Scheduled',
                'date',
                'after:now',
            ],

            'images' => ['nullable', 'array', 'max:10'],

            'images.*' => [
                'required',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:15360',
            ],
        ];
    }
}
