# Amber window: percentage replaced with an absolute figure

Copy the five files in, then:

```
php artisan migrate
php artisan test
```

This one **does** need a migration.

## Why the model changed

The percentage threshold could not reproduce the client's own sheet.

| Their row | Interval | Remaining | % left | Their status |
| --- | --- | --- | --- | --- |
| 14 | 250 hrs | 200 | 80% | **soon** |
| 12 | 500 hrs | 400 | 80% | ok |
| 16 | 5,000 hrs | 1,800 | 36% | ok |
| 27 | 9,000 hrs | 5,800 | 64% | ok |

Rows 12 and 14 both sit at 80 per cent remaining and are coloured differently,
so proportion is not what they are using. What separates them is the absolute
figure: 200 hours is amber, 400 is not. Their window is somewhere between the
two.

It is also the better model. Amber exists to say "arrange spares and vessel
availability now", and that lead time does not scale with the interval. Under a
25 per cent rule a 10-hour task would turn amber with 2.5 hours left, which is
no use for ordering anything, while a 9,000-hour overhaul would sit amber for
2,250 hours -- months of noise that trains people to ignore the colour.

## What changed

- `maintenance_settings.warning_threshold_percent` becomes
  `warning_window_hours` (default 250) and `warning_window_days` (default 14).
- `maintenance_plans.warning_threshold_percent` becomes `warning_window`, a
  single nullable figure read as hours on a meter line and days on a calendar
  line.
- `DueDateService::status()` compares the remaining figure against that window.

## Open point for design freeze

Their sheet contains exactly one amber row, so it fixes the hours window only
to somewhere between 200 and 400. 250 is a reasonable default, not a finding.
The days window has no evidence behind it at all -- their Pumps sheet shows no
amber rows.

Both need confirming, and both are per-organisation settings with a per-plan
override, so nothing is hard-coded either way.
