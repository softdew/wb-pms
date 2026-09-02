<?php

namespace App\Exports;

use App\Models\Equipment;
use App\Models\MaintenancePlan;
use App\Services\DueDateService;
use App\Services\MeterReadingService;
use Illuminate\Support\Carbon;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * The client's monthly Main Engine return, generated from the system.
 *
 * Column order and headings follow SM_Templates.xlsx as supplied, so the output
 * can be laid alongside their own sheet and compared row for row.
 */
class MainEngineSheetExport implements FromArray, WithColumnWidths, WithEvents, WithStyles, WithTitle
{
    protected int $headerRows = 5;

    public function __construct(
        protected Equipment $equipment,
        protected Carbon $periodStart,
        protected Carbon $periodEnd,
    ) {
    }

    public function title(): string
    {
        return 'Main Engine';
    }

    public function array(): array
    {
        $dueDates = app(DueDateService::class);
        $meters = app(MeterReadingService::class);

        $equipment = $this->equipment->loadMissing(['vessel.incharge', 'model']);
        $total = (float) ($equipment->current_meter_reading ?? 0);
        $lastMonth = $meters->usageBetween($equipment, $this->periodStart, $this->periodEnd);

        $rows = [
            ['Engine details', null, 'ME running hrs total:', $total, 'Vessel:', $equipment->vessel?->name, 'Month:', $this->periodEnd->format('F')],
            [trim(($equipment->model?->make ?? '').' '.($equipment->model?->model ?? '')), null, 'ME running hrs last month:', $lastMonth, 'Vessel incharge:', $equipment->vessel?->incharge?->name, 'Year:', $this->periodEnd->format('Y')],
            ['Engine serial no', $equipment->serial_no],
            [],
            ['Engine part', 'Reference section', 'Interval in hrs', 'Last overhaul date', 'Last overhaul hrs', 'Hrs since last overhaul', 'Hrs to next overhaul', 'Status', 'Total hrs'],
        ];

        $plans = MaintenancePlan::query()
            ->active()
            ->where('equipment_id', $equipment->id)
            ->with('task')
            ->get()
            ->sortBy(fn (MaintenancePlan $plan) => $plan->task?->sort_order ?? 0);

        foreach ($plans as $plan) {
            $rows[] = [
                $plan->task?->activity_description,
                $plan->task?->controlling_reference,
                $plan->effectiveIntervalValue(),
                $plan->last_done_on?->format('d/m/Y'),
                $plan->last_done_meter_reading !== null ? (float) $plan->last_done_meter_reading : null,
                $dueDates->consumedSinceCompletion($plan),
                $dueDates->remaining($plan),
                $dueDates->status($plan)->sheetLabel(),
                $total,
            ];
        }

        return $rows;
    }

    public function columnWidths(): array
    {
        return [
            'A' => 52, 'B' => 16, 'C' => 14, 'D' => 17,
            'E' => 16, 'F' => 20, 'G' => 20, 'H' => 10, 'I' => 11,
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true]],
            $this->headerRows => ['font' => ['bold' => true]],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $lastRow = $sheet->getHighestRow();
                $header = $this->headerRows;

                $sheet->getStyle("A{$header}:I{$header}")->applyFromArray([
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'D9E2F3']],
                    'alignment' => ['wrapText' => true, 'vertical' => Alignment::VERTICAL_CENTER],
                ]);

                $sheet->getStyle("A{$header}:I{$lastRow}")->applyFromArray([
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'AEBBD4']]],
                ]);

                // Colour the status column the way their sheet reads: red for
                // due, amber for soon, green for ok.
                for ($row = $header + 1; $row <= $lastRow; $row++) {
                    $status = (string) $sheet->getCell("H{$row}")->getValue();

                    $colour = match ($status) {
                        'due' => 'F8CBCB',
                        'soon' => 'FCE4B6',
                        'ok' => 'D6EBD6',
                        default => null,
                    };

                    if ($colour) {
                        $sheet->getStyle("H{$row}")->applyFromArray([
                            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $colour]],
                            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                        ]);
                    }
                }

                $sheet->freezePane('A'.($header + 1));
            },
        ];
    }
}
