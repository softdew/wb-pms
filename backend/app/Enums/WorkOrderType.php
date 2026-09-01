<?php

namespace App\Enums;

enum WorkOrderType: string
{
    case Preventive = 'preventive';
    case Breakdown = 'breakdown';
    case Overhaul = 'overhaul';
    case Statutory = 'statutory';
    case ConditionBased = 'condition_based';
    case FailureFinding = 'failure_finding';

    /** Unplanned work, for the planned-to-unplanned ratio. */
    public function isUnplanned(): bool
    {
        return $this === self::Breakdown;
    }

    public static function fromTrigger(TriggerClass $trigger): self
    {
        return match ($trigger) {
            TriggerClass::Statutory => self::Statutory,
            TriggerClass::Condition => self::ConditionBased,
            default => self::Preventive,
        };
    }
}
