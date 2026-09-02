<?php

namespace App\Support;

final class Roles
{
    public const DEPARTMENT_ADMIN = 'department-admin';
    public const TECHNICAL_AUTHORITY = 'technical-authority';
    public const PLANNER = 'planner';
    public const SUPERVISOR = 'supervisor';
    public const STORE = 'store';
    public const OPERATOR = 'operator';
    public const AUDITOR = 'auditor';
    public const MANAGEMENT = 'management';

    /** Roles held outside the department. */
    public const EXTERNAL = [self::OPERATOR, self::AUDITOR];

    public static function all(): array
    {
        return [
            self::DEPARTMENT_ADMIN, self::TECHNICAL_AUTHORITY, self::PLANNER,
            self::SUPERVISOR, self::STORE, self::OPERATOR, self::AUDITOR,
            self::MANAGEMENT,
        ];
    }

    public static function label(string $role): string
    {
        return match ($role) {
            self::DEPARTMENT_ADMIN => 'Department administrator',
            self::TECHNICAL_AUTHORITY => 'Technical authority',
            self::PLANNER => 'Planner',
            self::SUPERVISOR => 'Supervisor',
            self::STORE => 'Store',
            self::OPERATOR => 'Operator',
            self::AUDITOR => 'Auditor',
            self::MANAGEMENT => 'Management',
            default => $role,
        };
    }
}
