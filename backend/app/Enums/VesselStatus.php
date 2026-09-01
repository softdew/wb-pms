<?php

namespace App\Enums;

enum VesselStatus: string
{
    case Active = 'active';
    case UnderRepair = 'under_repair';
    case LaidUp = 'laid_up';
    case Disposed = 'disposed';
}
