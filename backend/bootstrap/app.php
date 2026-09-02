<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
		$middleware->alias([
			'tenant' => \App\Http\Middleware\SetTenantContext::class,
			'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
			'role'       => \Spatie\Permission\Middleware\RoleMiddleware::class,
		]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (\App\Exceptions\MaintenanceRuleException $e, $request) {
			if ($request->expectsJson()) {
				return response()->json([
					'message' => $e->getMessage(),
					'error' => 'maintenance_rule',
				], 422);
			}
		});
    })->create();
	
