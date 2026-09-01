<?php

namespace App\Enums;

/**
 * Five-level hierarchy of the ISO 14224 type. Depth actually used is a
 * configuration decision -- most assets will stop at equipment unit.
 */
enum TaxonomyLevel: string
{
    case Installation = 'installation';
    case System = 'system';
    case EquipmentUnit = 'equipment_unit';
    case SubUnit = 'sub_unit';
    case Component = 'component';
}
