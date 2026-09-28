<?php

namespace App\Enums;

enum AccountStatus: string
{
    case PENDING_VERIFICATION = 'PENDING_VERIFICATION';
    case ACTIVE = 'ACTIVE';
    case DEACTIVATED = 'DEACTIVATED';
}