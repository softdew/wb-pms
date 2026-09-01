<?php

namespace App\Enums;

enum PartLineType: string
{
    case Spare = 'spare';
    case Consumable = 'consumable';
    case SpecialTool = 'special_tool';
}
