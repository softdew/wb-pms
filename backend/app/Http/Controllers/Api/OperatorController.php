<?php

namespace App\Http\Controllers\Api;

use App\Models\Operator;
use App\Models\User;
use App\Models\Vessel;
use App\Services\OperatorService;
use App\Support\Permissions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OperatorController extends CrudController
{
    protected array $searchable = ['code', 'name', 'agreement_no', 'tender_reference'];

    public function __construct(protected OperatorService $operators)
    {
    }

    protected function model(): string
    {
        return Operator::class;
    }

    protected function rules(Request $request, ?Model $record = null): array
    {
        return [
            'code' => ['required', 'string', 'max:32'],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:department,private_company,cooperative_society'],
            'agreement_no' => ['nullable', 'string', 'max:64'],
            'tender_reference' => ['nullable', 'string', 'max:64'],
            'agreement_from' => ['nullable', 'date'],
            'agreement_to' => ['nullable', 'date', 'after_or_equal:agreement_from'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'contact_designation' => ['nullable', 'string', 'max:128'],
            'contact_phone' => ['nullable', 'string', 'max:32'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string'],
            'remarks' => ['nullable', 'string'],
            'status' => ['nullable', 'in:active,ended'],
        ];
    }

    protected function applyFilters(Request $request, Builder $query): void
    {
        if ($status = $request->string('status')->value()) {
            $query->where('status', $status);
        }

        $query->withCount(['vessels', 'users']);
    }

    /**
     * Create the operating company and its login together. A society with no
     * login cannot record anything, so the two belong in one act.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(array_merge($this->rules($request), [
            'login_email' => ['nullable', 'email', 'max:255', Rule::unique('users', 'email')],
            'login_password' => ['nullable', 'string', 'min:10', 'max:72'],
            'login_name' => ['nullable', 'string', 'max:255'],
        ]));

        $login = ! empty($data['login_email'])
            ? [
                'email' => $data['login_email'],
                'password' => $data['login_password'] ?? null,
                'name' => $data['login_name'] ?? null,
            ]
            : null;

        $result = $this->operators->create(
            collect($data)->except(['login_email', 'login_password', 'login_name'])->all(),
            $login,
        );

        return $this->ok([
            'operator' => $result['operator'],
            'user' => $result['user']?->only(['id', 'name', 'email']),
            // Returned once, at creation, so the admin can hand it over.
            'password' => $result['password'],
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $operator = Operator::withCount(['vessels', 'users'])->findOrFail($id);

        return $this->ok([
            'operator' => $operator,
            'vessels' => Vessel::where('operator_id', $operator->id)
                ->with('shipType:id,code,name')
                ->orderBy('name')
                ->get(['id', 'code', 'name', 'ship_type_id', 'status', 'operator_from']),
            'users' => User::where('operator_id', $operator->id)
                ->get(['id', 'name', 'email', 'status', 'last_login_at']),
            'incharges' => $operator->incharges()
                ->orderBy('name')
                ->get(['id', 'name', 'designation', 'licence_no', 'licence_valid_until', 'status']),
        ]);
    }

    public function issueLogin(Request $request, int $id): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['nullable', 'string', 'min:10', 'max:72'],
            'name' => ['nullable', 'string', 'max:255'],
        ]);

        $operator = Operator::findOrFail($id);
        $password = $data['password'] ?? \Illuminate\Support\Str::password(12, symbols: false);

        $user = $this->operators->issueLogin($operator, $data['email'], $password, $data['name'] ?? null);

        return $this->ok([
            'user' => $user->only(['id', 'name', 'email']),
            'password' => $password,
        ], 201);
    }

    public function suspend(Request $request, int $id): JsonResponse
    {
        $this->authorizeAdmin($request);

        return $this->ok($this->operators->suspend(Operator::findOrFail($id)));
    }

    public function reinstate(Request $request, int $id): JsonResponse
    {
        $this->authorizeAdmin($request);

        return $this->ok($this->operators->reinstate(Operator::findOrFail($id)));
    }

    protected function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()->can(Permissions::MANAGE_OPERATORS), 403);
    }
}
