<?php

namespace App\Http\Requests\Attendance;

use App\Enums\AttendanceStatus;
use App\Models\EventRegistration;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Manual attendance change by the event's managers (questionnaire Q33).
 * PENDING is not a final result, so it cannot be set by hand.
 */
class UpdateAttendanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        $registration = $this->route('registration');

        return $registration instanceof EventRegistration
            && ($this->user()?->can('modifyAttendance', $registration) ?? false);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'attendance_status' => ['required', Rule::in([
                AttendanceStatus::ATTENDED->value,
                AttendanceStatus::ABSENT->value,
                AttendanceStatus::INCOMPLETE->value,
            ])],
            // attendance_modified_at the manager saw; null while automatic.
            'attendance_version' => ['present', 'nullable', 'date_format:Y-m-d H:i:s'],
        ];
    }
}
