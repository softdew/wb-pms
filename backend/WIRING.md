# Wiring — three edits to `bootstrap/app.php`

## 1. Register the tenant middleware alias

```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'tenant' => \App\Http\Middleware\SetTenantContext::class,
    ]);
})
```

## 2. Turn domain rule violations into 422 responses

Without this a refused run-to-failure or a missing close-out code returns a 500.
They are not errors — they are the system declining to record something the
maintenance logic does not permit, and the message is written to be shown to
the user.

```php
->withExceptions(function (Exceptions $exceptions) {
    $exceptions->render(function (\App\Exceptions\MaintenanceRuleException $e, $request) {
        if ($request->expectsJson()) {
            return response()->json([
                'message' => $e->getMessage(),
                'error' => 'maintenance_rule',
            ], 422);
        }
    });
})
```

## 3. Confirm the API routes are loaded

`php artisan install:api` should already have added `api: __DIR__.'/../routes/api.php'`
to `withRouting()`. Check it is there, then:

```
php artisan route:list --path=api
```

## Generating the spec for Deloitte

Scramble is already installed:

```
php artisan scramble:export
```

That writes `api.json` — the OpenAPI document to hand over. Browsable at
`/docs/api` in local. Worth generating once now so there is something concrete
to send when they ask for interface specifications, rather than a promise.
