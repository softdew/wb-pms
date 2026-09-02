<?php

namespace App\Enums;

enum OperatorType: string
{
    /** Run directly by the department's own crews and workshops. */
    case Department = 'department';

    case PrivateCompany = 'private_company';

    case CooperativeSociety = 'cooperative_society';

    public function label(): string
    {
        return match ($this) {
            self::Department => 'Department operated',
            self::PrivateCompany => 'Private company',
            self::CooperativeSociety => 'Cooperative society',
        };
    }
}
