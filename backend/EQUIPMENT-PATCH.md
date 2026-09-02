# One addition to `app/Models/Equipment.php`

The export needs the plan lines for an asset. Add this relation alongside the
existing ones:

```php
public function maintenancePlans(): HasMany
{
    return $this->hasMany(MaintenancePlan::class);
}

/** Active plan lines in sheet order, for the monthly return. */
public function maintenancePlansForExport()
{
    return $this->maintenancePlans()
        ->where('status', MaintenancePlan::STATUS_ACTIVE)
        ->with('task')
        ->get()
        ->sortBy(fn (MaintenancePlan $plan) => $plan->task?->sort_order ?? 0);
}
```

No new import is needed — `HasMany` is already imported in that file.
