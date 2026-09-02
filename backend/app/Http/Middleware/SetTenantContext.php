<?php

namespace App\Http\Middleware;

use App\Support\OperatorContext;
use App\Support\Tenancy;
use Closure;
use Illuminate\Http\Request;
use Spatie\Permission\PermissionRegistrar;
use Symfony\Component\HttpFoundation\Response;

/**
 * Establishes three things for the request: the tenant, the team context Spatie
 * needs to resolve roles, and the operating company where there is one.
 *
 * All three matter. Without the tenant, every query throws. Without the
 * permission team id, role checks silently return false and every endpoint
 * 403s -- which looks like a permissions bug and is actually a missing line
 * here. Without the operator, a cooperative society sees the whole fleet
 * instead of its own vessels.
 */
class SetTenantContext
{
    public function __construct(
        protected Tenancy $tenancy,
        protected OperatorContext $operators,
    ) {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        if ($user->is_platform_admin) {
            // Platform administrators sit above the tenants and must name the
            // organisation they are acting in. There is deliberately no ambient
            // cross-tenant mode: a persistent unscoped session is how one
            // operator ends up seeing another operator's fleet.
            $requested = $request->header('X-Organisation-Id');

            if ($requested !== null) {
                $this->tenancy->set((int) $requested);
                $this->setPermissionTeam((int) $requested);
            }

            // Never tied to an operating company.
            $this->operators->set(null);

            return $next($request);
        }

        $organisation = $user->organisation;

        if (! $organisation) {
            abort(403, 'This account is not attached to an organisation.');
        }

        if (! $organisation->isActive()) {
            abort(403, 'This organisation is suspended.');
        }

        $this->tenancy->set($organisation);
        $this->setPermissionTeam($organisation->id);

        // Null for department staff and auditors, who see the whole fleet.
        // Set for an operating company's login, which sees only its own vessels.
        $this->operators->set($user->operator_id);

        return $next($request);
    }

    protected function setPermissionTeam(int $organisationId): void
    {
        app(PermissionRegistrar::class)->setPermissionsTeamId($organisationId);
    }
}