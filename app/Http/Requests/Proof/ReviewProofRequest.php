<?php

namespace App\Http\Requests\Proof;

use App\Models\EventRegistration;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Approve or reject a proof photo. A rejection carries the specific reason
 * shown to the student (questionnaire Q30).
 */
class ReviewProofRequest extends FormRequest
{
    public function authorize(): bool
    {
        $registration = $this->route('registration');

        return $registration instanceof EventRegistration
            && ($this->user()?->can('reviewProof', $registration) ?? false);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'decision' => ['required', Rule::in(['approve', 'reject'])],
            'reason' => ['exclude_unless:decision,reject', 'required', 'string', 'max:1000'],
            'proof_version' => ['required', 'date_format:Y-m-d H:i:s'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'reason.required' => 'Give the student a reason for the rejection.',
        ];
    }
}
