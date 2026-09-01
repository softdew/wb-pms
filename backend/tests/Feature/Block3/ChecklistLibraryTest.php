<?php

namespace Tests\Feature\Block3;

use App\Enums\PartLineType;
use App\Models\ChecklistTask;
use App\Models\Part;
use Illuminate\Database\QueryException;

class ChecklistLibraryTest extends Block3TestCase
{
    /** The client's "Reference Section" column: 5.1.1, 5.3.1 and so on. */
    public function test_a_task_carries_its_controlling_reference(): void
    {
        $task = $this->makeTask([
            'activity_description' => 'Change engine oil',
            'controlling_reference' => '5.1.2',
            'section' => 'Main Engine Overhaul',
            'sort_order' => 20,
        ]);

        $this->assertSame('5.1.2', $task->controlling_reference);
        $this->assertSame('Main Engine Overhaul', $task->section);
    }

    public function test_tasks_sort_within_their_section(): void
    {
        $this->makeTask(['section' => 'Main Engine Overhaul', 'sort_order' => 30, 'activity_description' => 'Third']);
        $this->makeTask(['section' => 'Main Engine Overhaul', 'sort_order' => 10, 'activity_description' => 'First']);
        $this->makeTask(['section' => 'Main Engine Overhaul', 'sort_order' => 20, 'activity_description' => 'Second']);

        $ordered = ChecklistTask::orderBy('section')->orderBy('sort_order')->pluck('activity_description');

        $this->assertSame(['First', 'Second', 'Third'], $ordered->all());
    }

    public function test_a_task_lists_the_parts_it_consumes(): void
    {
        $task = $this->makeTask();
        $oil = Part::create(['code' => 'OIL-15W40', 'name' => 'Lube oil 15W40', 'uom' => 'litre']);
        $filter = Part::create(['code' => 'FLT-1', 'name' => 'Oil filter cartridge']);

        $task->parts()->createMany([
            ['part_id' => $oil->id, 'quantity' => 40, 'line_type' => PartLineType::Consumable],
            ['part_id' => $filter->id, 'quantity' => 1, 'line_type' => PartLineType::Spare],
        ]);

        $this->assertSame(2, $task->parts()->count());
        $this->assertSame('Lube oil 15W40', $task->parts()->first()->part->name);
    }

    public function test_the_same_part_cannot_be_listed_twice_under_one_line_type(): void
    {
        $task = $this->makeTask();
        $part = Part::create(['code' => 'FLT-1', 'name' => 'Oil filter']);

        $task->parts()->create(['part_id' => $part->id, 'quantity' => 1, 'line_type' => PartLineType::Spare]);

        $this->expectException(QueryException::class);

        $task->parts()->create(['part_id' => $part->id, 'quantity' => 2, 'line_type' => PartLineType::Spare]);
    }

    public function test_readings_carry_their_acceptance_limits(): void
    {
        $task = $this->makeTask();

        $reading = $task->readings()->create([
            'parameter' => 'Lube oil pressure',
            'unit' => 'bar',
            'minimum' => 3.5,
            'maximum' => 5.5,
        ]);

        $this->assertTrue($reading->isWithinLimits(4.2));
        $this->assertFalse($reading->isWithinLimits(2.9));
        $this->assertFalse($reading->isWithinLimits(6.0));
    }

    public function test_interval_labels_read_the_way_the_client_writes_them(): void
    {
        $this->assertSame('500 hrs', $this->makeTask(['default_interval_value' => 500, 'default_interval_unit' => 'hours'])->intervalLabel());
        $this->assertSame('3 months', $this->makeTask(['default_interval_value' => 3, 'default_interval_unit' => 'months'])->intervalLabel());
        $this->assertSame('1 year', $this->makeTask(['default_interval_value' => 1, 'default_interval_unit' => 'years'])->intervalLabel());
        $this->assertSame('5 years', $this->makeTask(['default_interval_value' => 5, 'default_interval_unit' => 'years'])->intervalLabel());
    }

    public function test_task_codes_are_unique_within_an_organisation(): void
    {
        $this->makeTask(['code' => 'ME-OIL']);

        $this->expectException(QueryException::class);

        $this->makeTask(['code' => 'ME-OIL']);
    }
}
