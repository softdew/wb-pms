<?php

namespace App\Enums;

enum AssessmentStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
}
