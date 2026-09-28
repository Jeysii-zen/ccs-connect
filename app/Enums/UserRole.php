<?php

namespace App\Enums;

enum UserRole: string
{
    case STUDENT = 'student';
    case FACULTY = 'faculty';
    case ADMIN = 'admin';
}