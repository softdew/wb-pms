<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Due status must be current before release reads it, so these run in order.
Schedule::command('cmms:recompute-due-dates')
    ->dailyAt('01:00')
    ->withoutOverlapping()
    ->onOneServer();

Schedule::command('cmms:release-work-orders')
    ->dailyAt('01:30')
    ->withoutOverlapping()
    ->onOneServer();