<?php

namespace App\Enums;

enum MaintenanceStrategy: string
{
    /** High band: tasks derived from the organisation's failure-mode analysis. */
    case AnalysisDerived = 'analysis_derived';

    /** Medium band: time-based or usage-based preventive maintenance. */
    case TimeOrUsageBased = 'time_or_usage_based';

    /** Low band: inspect and run to failure. */
    case InspectAndRunToFailure = 'inspect_and_run_to_failure';

    /** The strategy normally expected for a given band. */
    public static function defaultFor(CriticalityBand $band): self
    {
        return match ($band) {
            CriticalityBand::High => self::AnalysisDerived,
            CriticalityBand::Medium => self::TimeOrUsageBased,
            CriticalityBand::Low => self::InspectAndRunToFailure,
        };
    }
}
