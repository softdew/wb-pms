<?php

namespace App\Console\Commands;

use App\Models\Organisation;
use App\Support\ServiceAvailability;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Reports what the environment actually offers, so a deployment problem is
 * visible before it becomes a support call.
 *
 *   php artisan cmms:doctor
 */
class Doctor extends Command
{
    protected $signature = 'cmms:doctor';

    protected $description = 'Check the environment and report which drivers are in use';

    public function handle(): int
    {
        ServiceAvailability::forget();

        $rows = [];
        $problems = 0;

        // --- PHP -------------------------------------------------------------
        $rows[] = ['PHP', PHP_VERSION, version_compare(PHP_VERSION, '8.3', '>=') ? 'OK' : 'Needs 8.3+'];
        if (version_compare(PHP_VERSION, '8.3', '<')) {
            $problems++;
        }

        foreach (['pdo_pgsql', 'mbstring', 'openssl', 'curl', 'fileinfo', 'zip', 'gd', 'intl'] as $ext) {
            $loaded = extension_loaded($ext);
            $rows[] = ['ext-'.$ext, $loaded ? 'loaded' : 'missing', $loaded ? 'OK' : 'Enable in php.ini'];
            if (! $loaded) {
                $problems++;
            }
        }

        // --- Database --------------------------------------------------------
        try {
            DB::connection()->getPdo();
            $driver = DB::connection()->getDriverName();
            $count = Organisation::query()->count();
            $rows[] = ['Database', $driver, 'OK ('.$count.' organisation(s))'];
        } catch (Throwable $e) {
            $rows[] = ['Database', config('database.default'), 'FAILED: '.$e->getMessage()];
            $problems++;
        }

        // --- Redis (optional) ------------------------------------------------
        if (config('cmms.redis.enabled')) {
            $up = ServiceAvailability::redisReachable();
            $rows[] = ['Redis', 'enabled', $up ? 'OK' : 'Unreachable - using fallback drivers'];
        } else {
            $rows[] = ['Redis', 'disabled', 'OK - not required'];
        }

        // --- Effective drivers ----------------------------------------------
        $rows[] = ['Cache driver', config('cache.default'), 'OK'];
        $rows[] = ['Queue driver', config('queue.default'), 'OK'];
        $rows[] = ['Session driver', config('session.driver'), 'OK'];
        $rows[] = ['Mail transport', config('mail.default'), 'OK'];
        $rows[] = ['Filesystem disk', config('filesystems.default'), 'OK'];

        // --- Writable paths --------------------------------------------------
        foreach ([storage_path(), storage_path('framework'), storage_path('logs'), base_path('bootstrap/cache')] as $path) {
            $writable = is_dir($path) && is_writable($path);
            $rows[] = ['Writable', str_replace(base_path().DIRECTORY_SEPARATOR, '', $path), $writable ? 'OK' : 'NOT WRITABLE'];
            if (! $writable) {
                $problems++;
            }
        }

        // --- Queue tables, when running on the database driver ---------------
        if (config('queue.default') === 'database') {
            $hasJobs = $this->tableExists('jobs');
            $rows[] = ['Queue table', 'jobs', $hasJobs ? 'OK' : 'Missing - run php artisan migrate'];
            if (! $hasJobs) {
                $problems++;
            }
        }

        if (config('cache.default') === 'database') {
            $hasCache = $this->tableExists('cache');
            $rows[] = ['Cache table', 'cache', $hasCache ? 'OK' : 'Missing - run php artisan migrate'];
            if (! $hasCache) {
                $problems++;
            }
        }

        if (config('session.driver') === 'database') {
            $hasSessions = $this->tableExists('sessions');
            $rows[] = ['Session table', 'sessions', $hasSessions ? 'OK' : 'Missing - run php artisan migrate'];
            if (! $hasSessions) {
                $problems++;
            }
        }

        $this->table(['Check', 'Value', 'Status'], $rows);

        if ($problems > 0) {
            $this->error($problems.' problem(s) found.');

            return self::FAILURE;
        }

        $this->info('Environment looks good.');
        $this->line('Remember: the scheduler needs either cron (production) or '
            .'`php artisan schedule:work` in a spare terminal (development).');

        return self::SUCCESS;
    }

    protected function tableExists(string $table): bool
    {
        try {
            return DB::getSchemaBuilder()->hasTable($table);
        } catch (Throwable) {
            return false;
        }
    }
}
