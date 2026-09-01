<?php

namespace App\Providers;

use App\Support\ServiceAvailability;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\ServiceProvider;

/**
 * Decides which cache, queue and session drivers are actually usable, before
 * anything resolves them.
 *
 * Must run in register(), not boot(): by the time boot() fires, the cache
 * manager may already have been resolved against the configured driver.
 */
class InfrastructureServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        if (! config('cmms.redis.enabled')) {
            $this->useFallbackDrivers();

            return;
        }

        if (! config('cmms.redis.fallback_when_unavailable')) {
            return; // Redis is required by configuration -- let it fail loudly.
        }

        if (! ServiceAvailability::redisReachable()) {
            Log::warning('Redis is enabled but unreachable. Falling back to database drivers.');

            $this->useFallbackDrivers();
        }
    }

    protected function useFallbackDrivers(): void
    {
        $drivers = config('cmms.redis.fallback_drivers');

        // Only override a driver that is actually asking for Redis. An explicit
        // choice of "file" or "sync" in .env is left alone.
        if (config('cache.default') === 'redis') {
            config(['cache.default' => $drivers['cache']]);
        }

        if (config('queue.default') === 'redis') {
            config(['queue.default' => $drivers['queue']]);
        }

        if (config('session.driver') === 'redis') {
            config(['session.driver' => $drivers['session']]);
        }
    }
}
