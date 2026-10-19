<?php

namespace App\Enums;

/**
 * Attendance states (questionnaire Q32). Registrations start PENDING;
 * the attendance phase decides the final value.
 */
enum AttendanceStatus: string
{
    case PENDING = 'PENDING';
    case ATTENDED = 'ATTENDED';
    case ABSENT = 'ABSENT';
    case INCOMPLETE = 'INCOMPLETE';
}
