<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAnnouncementRequest extends FormRequest
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
            'title' => [
                'required',
                'string',
                'max:255',
            ],

            'description_content' => [
                'required',
                'string',
            ],

            'announcement_status' => [
                'required',
                Rule::in(['Draft', 'Published', 'Scheduled']),
            ],

            'scheduled_at' => [
                'nullable',
                'required_if:announcement_status,Scheduled',
                'date',
                'after:now',
            ],

            'announcement_date' => [
                'nullable',
                'date',
            ],

            'images' => [
                'nullable',
                'array',
                'max:10',
            ],

            'images.*' => [
                'required',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:15360',
            ],

            'remove_image_ids' => [
                'nullable',
                'array',
            ],

            'remove_image_ids.*' => [
                'required',
                'integer',
                'distinct',
                'min:1',
            ],
        ];
    }
}
