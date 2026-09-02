<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WorkOrder;
use App\Support\Permissions;

/**
 * Permissions say what a role may do. This says what it may do it to.
 *
 * An operator holds one shared login for the whole company and may record work
 * only against the vessels currently assigned to it. Everyone can see
 * everything -- the department asked for transparency -- but seeing is not
 * writing.
 */
class WorkOrderPolicy
{
    public function view(User $user, WorkOrder $workOrder): bool
    {
        return $user->can(Permissions::VIEW_WORK_ORDERS);
    }

    public function execute(User $user, WorkOrder $workOrder): bool
    {
        return $user->can(Permissions::EXECUTE_WORK_ORDER)
            && $this->operatesTheVessel($user, $workOrder);
    }

    public function complete(User $user, WorkOrder $workOrder): bool
    {
        return $user->can(Permissions::COMPLETE_WORK_ORDER)
            && $this->operatesTheVessel($user, $workOrder);
    }

    public function close(User $user, WorkOrder $workOrder): bool
    {
        // Closing is the department's act of accepting the work, so it stays
        // with department staff even where the operator carried the job out.
        return $user->can(Permissions::CLOSE_WORK_ORDER) && ! $user->isOperator();
    }

    public function cancel(User $user, WorkOrder $workOrder): bool
    {
        return $user->can(Permissions::CANCEL_WORK_ORDER) && ! $user->isOperator();
    }

    /**
     * Department users are not tied to an operator, so this is true for them.
     * An operator user must hold the vessel the work order sits on.
     */
    protected function operatesTheVessel(User $user, WorkOrder $workOrder): bool
    {
        if (! $user->isOperator()) {
            return true;
        }

        $vesselOperatorId = $workOrder->equipment?->vessel?->operator_id;

        return $vesselOperatorId !== null && $vesselOperatorId === $user->operator_id;
    }
}
