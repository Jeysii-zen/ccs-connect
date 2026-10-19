<?php

namespace App\Http\Requests\Attendance;

/**
 * Drop a manual attendance change so the status is derived again. Same
 * managers as a change (questionnaire Q33).
 */
class ResetAttendanceRequest extends UpdateAttendanceRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'attendance_version' => ['required', 'date_format:Y-m-d H:i:s'],
        ];
    }
}
