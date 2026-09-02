<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChecklistTaskController;
use App\Http\Controllers\Api\CriticalityController;
use App\Http\Controllers\Api\EquipmentController;
use App\Http\Controllers\Api\LocationController;
use App\Http\Controllers\Api\MaintenancePlanController;
use App\Http\Controllers\Api\PartController;
use App\Http\Controllers\Api\ShipTypeController;
use App\Http\Controllers\Api\VesselController;
use App\Http\Controllers\Api\WorkOrderController;
use App\Support\Permissions as P;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\FailureCodeController;

Route::post('login', [AuthController::class, 'login'])->middleware('throttle:6,1');

Route::middleware(['auth:sanctum', 'tenant'])->group(function () {
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('me', [AuthController::class, 'me']);

    // -- reading ------------------------------------------------------------
    Route::middleware('permission:'.P::VIEW_MASTERS)->group(function () {
        Route::get('ship-types', [ShipTypeController::class, 'index']);
        Route::get('ship-types/{ship_type}', [ShipTypeController::class, 'show']);
        Route::get('locations', [LocationController::class, 'index']);
        Route::get('locations/{location}', [LocationController::class, 'show']);
        Route::get('checklist-tasks', [ChecklistTaskController::class, 'index']);
        Route::get('checklist-tasks/{checklist_task}', [ChecklistTaskController::class, 'show']);
    });

    Route::middleware('permission:'.P::VIEW_FLEET)->group(function () {
        Route::get('vessels', [VesselController::class, 'index']);
        Route::get('vessels/{vessel}', [VesselController::class, 'show']);
		Route::get('vessels/{vessel}/overview', [VesselController::class, 'overview']);
        Route::get('vessels/{vessel}/history', [VesselController::class, 'history']);
        Route::get('equipment', [EquipmentController::class, 'index']);
        Route::get('equipment/{equipment}', [EquipmentController::class, 'show']);
        Route::get('equipment/{equipment}/meter-readings', [EquipmentController::class, 'meterReadings']);
        Route::get('equipment/{equipment}/criticality', [CriticalityController::class, 'history']);
        Route::get('criticality/pending', [CriticalityController::class, 'pending']);
        Route::get('criticality/distribution', [CriticalityController::class, 'distribution']);
    });

    Route::middleware('permission:'.P::VIEW_PLANS)->group(function () {
        Route::get('maintenance-plans', [MaintenancePlanController::class, 'index']);
        Route::get('maintenance-plans/{plan}', [MaintenancePlanController::class, 'show']);
    });

    Route::middleware('permission:'.P::VIEW_WORK_ORDERS)->group(function () {
        Route::get('work-orders', [WorkOrderController::class, 'index']);
        Route::get('work-orders/backlog', [WorkOrderController::class, 'backlog']);
        Route::get('work-orders/{workOrder}', [WorkOrderController::class, 'show']);
		Route::get('failure-codes', [FailureCodeController::class, 'index']);
    });

    Route::middleware('permission:'.P::VIEW_STORES)->group(function () {
        Route::get('parts', [PartController::class, 'index']);
        Route::get('parts/{part}', [PartController::class, 'show']);
		Route::get('parts/{part}/stocks', [PartController::class, 'stocks']);
        Route::get('stock/below-reorder', [PartController::class, 'belowReorderLevel']);
    });

    // -- master data --------------------------------------------------------
    Route::middleware('permission:'.P::MANAGE_MASTERS)->group(function () {
        Route::apiResource('ship-types', ShipTypeController::class)->except(['index', 'show']);
        Route::apiResource('locations', LocationController::class)->except(['index', 'show']);
    });

    Route::middleware('permission:'.P::MANAGE_TASK_LIBRARY)->group(function () {
        Route::apiResource('checklist-tasks', ChecklistTaskController::class)->except(['index', 'show']);
    });

    Route::middleware('permission:'.P::MANAGE_FLEET)->group(function () {
        Route::apiResource('vessels', VesselController::class)->except(['index', 'show']);
        Route::apiResource('equipment', EquipmentController::class)->except(['index', 'show']);
    });

    // -- criticality: scoring and approval are separate permissions ----------
    Route::post('equipment/{equipment}/criticality', [CriticalityController::class, 'score'])
        ->middleware('permission:'.P::SCORE_CRITICALITY);

    Route::post('criticality/{assessment}/approve', [CriticalityController::class, 'approve'])
        ->middleware('permission:'.P::APPROVE_CRITICALITY);

    Route::post('criticality/{assessment}/reject', [CriticalityController::class, 'reject'])
        ->middleware('permission:'.P::APPROVE_CRITICALITY);

    Route::post('equipment/{equipment}/strategy', [EquipmentController::class, 'assignStrategy'])
        ->middleware('permission:'.P::ASSIGN_STRATEGY);

    // -- readings and planning ----------------------------------------------
    Route::post('equipment/{equipment}/meter-readings', [EquipmentController::class, 'recordMeterReading'])
        ->middleware('permission:'.P::RECORD_METER_READING);

    Route::middleware('permission:'.P::MANAGE_PLANS)->group(function () {
        Route::post('maintenance-plans', [MaintenancePlanController::class, 'store']);
        Route::post('maintenance-plans/{plan}/suspend', [MaintenancePlanController::class, 'suspend']);
        Route::post('maintenance-plans/{plan}/resume', [MaintenancePlanController::class, 'resume']);
        Route::post('equipment/{equipment}/apply-library', [MaintenancePlanController::class, 'applyLibrary']);
    });

    // -- work ----------------------------------------------------------------
    Route::middleware('permission:'.P::RAISE_WORK_ORDER)->group(function () {
        Route::post('work-orders/from-plan', [WorkOrderController::class, 'storeFromPlan']);
        Route::post('work-orders/breakdown', [WorkOrderController::class, 'storeBreakdown']);
        Route::post('work-orders/{workOrder}/release', [WorkOrderController::class, 'release']);
    });

    Route::post('work-orders/{workOrder}/start', [WorkOrderController::class, 'start'])
        ->middleware('permission:'.P::EXECUTE_WORK_ORDER);

    Route::post('work-orders/{workOrder}/readings/{reading}', [WorkOrderController::class, 'captureReading'])
        ->middleware('permission:'.P::EXECUTE_WORK_ORDER);

    Route::post('work-orders/{workOrder}/complete', [WorkOrderController::class, 'complete'])
        ->middleware('permission:'.P::COMPLETE_WORK_ORDER);

    Route::post('work-orders/{workOrder}/close', [WorkOrderController::class, 'close'])
        ->middleware('permission:'.P::CLOSE_WORK_ORDER);

    Route::post('work-orders/{workOrder}/cancel', [WorkOrderController::class, 'cancel'])
        ->middleware('permission:'.P::CANCEL_WORK_ORDER);

    // -- stores ---------------------------------------------------------------
    Route::middleware('permission:'.P::MANAGE_STORES)->group(function () {
        Route::apiResource('parts', PartController::class)->except(['index', 'show']);
    });

    Route::post('parts/{part}/movements', [PartController::class, 'movement'])
        ->middleware('permission:'.P::MOVE_STOCK);
		
	Route::post('parts/{part}/stock-policy', [PartController::class, 'setStockPolicy'])
        ->middleware('permission:'.P::MOVE_STOCK);

    Route::post('work-orders/{workOrder}/issue-parts', [WorkOrderController::class, 'issueParts'])
        ->middleware('permission:'.P::MOVE_STOCK);
});
