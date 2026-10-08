<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStudentAccountRequest extends FormRequest
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
            'first_name' => [
                'required',
                'string',
                'max:100',
            ],

            'middle_name' => [
                'nullable',
                'string',
                'max:100',
            ],

            'last_name' => [
                'required',
                'string',
                'max:100',
            ],

            'student_number' => [
                'required',
                'string',
                'regex:/^\d{2}-\d{2}-\d{3}$/',
                Rule::unique('users', 'student_number'),
            ],

            'year_level' => [
                'required',
                'string',
                'max:20',
            ],

            'block_number' => [
                'required',
                'string',
                'max:20',
            ],
        ];
    }
}
