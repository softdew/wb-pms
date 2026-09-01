<?php

namespace App\Support;

use Illuminate\Support\Facades\Redis;
use Throwable;

/**
 * Cheap reachability probes for optional infrastructure.
 *
 * The result is cached to a file rather than to the cache store, because the
 * cache store is one of the things being decided by this probe.
 */
class ServiceAvailability
{
    protected static ?bool $redisMemo = null;

    public static function redisReachable(): bool
    {
        if (static::$redisMemo !== null) {
            return static::$redisMemo;
        }

        $ttl = (int) config('cmms.redis.probe_ttl', 60);
        $file = static::probeFile();

        if (is_file($file) && (time() - filemtime($file)) < $ttl) {
            return static::$redisMemo = trim((string) @file_get_contents($file)) === '1';
        }

        $reachable = static::pingRedis();

        @file_put_contents($file, $reachable ? '1' : '0');

        return static::$redisMemo = $reachable;
    }

    /** Forget the memo and the probe file. Used by cmms:doctor and in tests. */
    public static function forget(): void
    {
        static::$redisMemo = null;
        @unlink(static::probeFile());
    }

    protected static function pingRedis(): bool
    {
        try {
            Redis::connection()->ping();

            return true;
        } catch (Throwable) {
            // Covers an unreachable server, a missing phpredis extension and a
            // missing predis package alike -- all mean "do not use Redis".
            return false;
        }
    }

    protected static function probeFile(): string
    {
        $dir = storage_path('framework');

        if (! is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }

        return $dir.'/redis-probe';
    }
}
