<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
		$this->app->singleton(\App\Support\Tenancy::class);
		$this->app->singleton(\App\Support\OperatorContext::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
		
		// Platform administrators sit above the tenants and hold no roles inside one,
		// so permission checks would refuse them everywhere. They are still bound by
		// the tenant scope: without X-Organisation-Id they reach no data at all.
		Gate::before(fn (\App\Models\User $user) => $user->is_platform_admin ? true : null);

		Gate::policy(\App\Models\WorkOrder::class, \App\Policies\WorkOrderPolicy::class);
		Gate::policy(\App\Models\Equipment::class, \App\Policies\EquipmentPolicy::class);
    }
}
