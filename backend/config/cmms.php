<?php

return [

    /*
    |---------------------------------------------------------------------------
    | Optional infrastructure
    |---------------------------------------------------------------------------
    |
    | The application must run on a plain PHP + PostgreSQL box with nothing else
    | installed. Redis is a performance option, never a requirement. Set
    | REDIS_ENABLED=true only where a server is actually available.
    |
    | When Redis is enabled but unreachable, the application falls back to the
    | database and file drivers rather than failing. That is deliberate: on a
    | government-hosted box we will not always be told when Redis goes away.
    |
    */

    'redis' => [
        'enabled' => env('REDIS_ENABLED', false),

        // Fall back automatically instead of throwing when Redis is enabled
        // but cannot be reached. Logs a warning each time it flips.
        'fallback_when_unavailable' => env('REDIS_FALLBACK', true),

        // How long a reachability check is trusted, in seconds. Keeps us from
        // pinging Redis on every single request.
        'probe_ttl' => env('REDIS_PROBE_TTL', 60),

        // Drivers used when Redis is off or unreachable.
        'fallback_drivers' => [
            'cache' => 'database',
            'queue' => 'database',
            'session' => 'database',
        ],
    ],

];
