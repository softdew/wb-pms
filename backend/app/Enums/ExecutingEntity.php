<?php

namespace App\Enums;

enum ExecutingEntity: string
{
    case OwnWorkshop = 'own_workshop';
    case OperatorCrew = 'operator_crew';
    case Contractor = 'contractor';
}
