<?php

namespace App\Enums;

enum AccountStatus: string
{
    case ACTIVE = 'ACTIVE';
    case DEACTIVATED = 'DEACTIVATED';
}
