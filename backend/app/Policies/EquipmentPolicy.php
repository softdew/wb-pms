<?php

namespace App\Policies;

use App\Models\Equipment;
use App\Models\User;
use App\Support\Permissions;

class EquipmentPolicy
{
    public function view(User $user, Equipment $equipment): bool
    {
        return $user->can(Permissions::VIEW_FLEET);
    }

    public function update(User $user, Equipment $equipment): bool
    {
        // The register belongs to the department. An operator runs the vessel;
        // it does not amend the asset record.
        return $user->can(Permissions::MANAGE_FLEET) && ! $user->isOperator();
    }

    public function recordMeterReading(User $user, Equipment $equipment): bool
    {
        if (! $user->can(Permissions::RECORD_METER_READING)) {
            return false;
        }

        if (! $user->isOperator()) {
            return true;
        }

        return $equipment->vessel?->operator_id === $user->operator_id;
    }
}
