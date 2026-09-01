<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * A domain rule was violated -- a run-to-failure strategy on a hidden-failure
 * asset, an approval by the assessor, a meter reading going backwards.
 *
 * These are not programming errors. They are the system refusing to record
 * something the maintenance logic does not permit, and the message is written
 * to be shown to the user.
 */
class MaintenanceRuleException extends RuntimeException
{
}
