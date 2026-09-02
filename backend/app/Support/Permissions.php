<?php

namespace App\Support;

use ReflectionClass;

/**
 * Every permission, and the roles that hold them.
 *
 * Kept in one file on purpose: whether a store clerk can approve a criticality
 * band should be answerable by reading a single list, not by tracing routes.
 */
final class Permissions
{
    public const VIEW_MASTERS = 'masters.view';
    public const VIEW_FLEET = 'fleet.view';
    public const VIEW_PLANS = 'plans.view';
    public const VIEW_WORK_ORDERS = 'work-orders.view';
    public const VIEW_STORES = 'stores.view';
    public const VIEW_REPORTS = 'reports.view';
    public const VIEW_AUDIT = 'audit.view';

    public const MANAGE_MASTERS = 'masters.manage';
    public const MANAGE_FLEET = 'fleet.manage';
    public const MANAGE_TASK_LIBRARY = 'task-library.manage';

    public const SCORE_CRITICALITY = 'criticality.score';
    public const APPROVE_CRITICALITY = 'criticality.approve';
    public const ASSIGN_STRATEGY = 'strategy.assign';

    public const MANAGE_PLANS = 'plans.manage';
    public const APPROVE_INTERVAL_CHANGE = 'plans.approve-interval-change';

    public const RAISE_WORK_ORDER = 'work-orders.raise';
    public const ASSIGN_WORK_ORDER = 'work-orders.assign';
    public const EXECUTE_WORK_ORDER = 'work-orders.execute';
    public const COMPLETE_WORK_ORDER = 'work-orders.complete';
    public const CLOSE_WORK_ORDER = 'work-orders.close';
    public const CANCEL_WORK_ORDER = 'work-orders.cancel';
    public const RECORD_METER_READING = 'meter-readings.record';

    public const MANAGE_STORES = 'stores.manage';
    public const MOVE_STOCK = 'stock.move';

    public const MANAGE_USERS = 'users.manage';
    public const MANAGE_SETTINGS = 'settings.manage';
    public const MANAGE_OPERATORS = 'operators.manage';

    public static function all(): array
    {
        return array_values((new ReflectionClass(self::class))->getConstants());
    }

    /** Read-only set, shared by the auditor and management roles. */
    public static function readOnly(): array
    {
        return [
            self::VIEW_MASTERS, self::VIEW_FLEET, self::VIEW_PLANS,
            self::VIEW_WORK_ORDERS, self::VIEW_STORES, self::VIEW_REPORTS,
        ];
    }

    /**
     * Role definitions.
     *
     * Note what the technical authority holds and the planner does not:
     * approving a criticality band and an interval change. Scoring and approval
     * are separate acts, and the service already refuses an approval by the
     * person who scored it -- this split is what makes that meaningful rather
     * than a formality one person can satisfy alone.
     */
    public static function roles(): array
    {
        return [
            Roles::DEPARTMENT_ADMIN => self::all(),

            Roles::TECHNICAL_AUTHORITY => array_merge(self::readOnly(), [
                self::VIEW_AUDIT,
                self::SCORE_CRITICALITY,
                self::APPROVE_CRITICALITY,
                self::ASSIGN_STRATEGY,
                self::MANAGE_PLANS,
                self::APPROVE_INTERVAL_CHANGE,
                self::MANAGE_TASK_LIBRARY,
                self::MANAGE_SETTINGS,
            ]),

            Roles::PLANNER => array_merge(self::readOnly(), [
                self::SCORE_CRITICALITY,
                self::MANAGE_PLANS,
                self::MANAGE_TASK_LIBRARY,
                self::MANAGE_FLEET,
                self::MANAGE_MASTERS,
                self::RAISE_WORK_ORDER,
                self::ASSIGN_WORK_ORDER,
                self::CANCEL_WORK_ORDER,
                self::RECORD_METER_READING,
            ]),

            Roles::SUPERVISOR => array_merge(self::readOnly(), [
                self::EXECUTE_WORK_ORDER,
                self::COMPLETE_WORK_ORDER,
                self::CLOSE_WORK_ORDER,
                self::RECORD_METER_READING,
                self::MOVE_STOCK,
            ]),

            Roles::STORE => array_merge(self::readOnly(), [
                self::MANAGE_STORES,
                self::MOVE_STOCK,
            ]),

            /**
             * The contractor's shared login: one account per operating company,
             * not per engineer, so a sign-off identifies the company. Writes are
             * further restricted by policy to vessels currently assigned to it.
             */
            Roles::OPERATOR => array_merge(self::readOnly(), [
                self::EXECUTE_WORK_ORDER,
                self::COMPLETE_WORK_ORDER,
                self::RECORD_METER_READING,
                self::MOVE_STOCK,
            ]),

            /** External. Reads everything, writes nothing, ever. */
            Roles::AUDITOR => array_merge(self::readOnly(), [
                self::VIEW_AUDIT,
            ]),

            Roles::MANAGEMENT => self::readOnly(),
        ];
    }
}
