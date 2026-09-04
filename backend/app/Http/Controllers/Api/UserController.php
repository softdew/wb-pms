<?php

namespace App\Http\Controllers\Api;

use App\Models\Trade;
use App\Models\User;
use App\Services\UserService;
use App\Support\Roles;
use App\Support\Tenancy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends ApiController
{
    public function __construct(protected UserService $users)
    {
    }

    public function index(Request $request): JsonResponse
    {
        // User deliberately carries no global tenant scope: it is how the
        // context is established, so scoping it would be circular. Every query
        // here must therefore filter by organisation itself.
        $query = User::query()
            ->where('organisation_id', app(Tenancy::class)->id())
            ->with(['trade:id,code,name', 'operator:id,code,name'])
            ->orderBy('name');

        if ($search = $request->string('search')->trim()->value()) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', '%'.$search.'%')
                    ->orWhere('email', 'ilike', '%'.$search.'%')
                    ->orWhere('employee_code', 'ilike', '%'.$search.'%');
            });
        }

        if ($request->boolean('department_only')) {
            $query->whereNull('operator_id');
        }

        $users = $query->get();

        return $this->ok([
            'users' => $users->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'employee_code' => $user->employee_code,
                'status' => $user->status,
                'last_login_at' => $user->last_login_at?->toDateTimeString(),
                'trade' => $user->trade?->only(['id', 'code', 'name']),
                'operator' => $user->operator?->only(['id', 'code', 'name']),
                'role' => $user->getRoleNames()->first(),
            ])->values(),
            'roles' => collect(Roles::all())
                ->reject(fn (string $role) => $role === Roles::OPERATOR)
                ->map(fn (string $role) => [
                    'value' => $role,
                    'label' => Roles::label($role),
                ])->values(),
            'trades' => Trade::query()->orderBy('name')->get(['id', 'code', 'name']),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'employee_code' => ['nullable', 'string', 'max:64'],
            'trade_id' => ['nullable', 'integer', 'exists:trades,id'],
            'role' => ['required', 'string'],
            'password' => ['nullable', 'string', 'min:10', 'max:72'],
        ]);

        $result = $this->users->create(
            collect($data)->only(['name', 'email', 'employee_code', 'trade_id'])->all(),
            $data['role'],
            $data['password'] ?? null,
        );

        return $this->ok([
            'user' => $result['user']->only(['id', 'name', 'email']),
            // Returned once, at creation. It is not stored readably.
            'password' => $result['password'],
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = $this->findInOrganisation($id);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'employee_code' => ['nullable', 'string', 'max:64'],
            'trade_id' => ['nullable', 'integer', 'exists:trades,id'],
            'role' => ['required', 'string'],
        ]);

        $user->update(collect($data)->only(['name', 'email', 'employee_code', 'trade_id'])->all());
        $this->users->assignRole($user, $data['role']);

        return $this->ok($user->refresh()->only(['id', 'name', 'email']));
    }

    public function resetPassword(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['password' => ['nullable', 'string', 'min:10', 'max:72']]);

        $password = $this->users->resetPassword($this->findInOrganisation($id), $data['password'] ?? null);

        return $this->ok(['password' => $password]);
    }

    public function suspend(Request $request, int $id): JsonResponse
    {
        return $this->ok(
            $this->users->setStatus($this->findInOrganisation($id), 'suspended', $request->user())
                ->only(['id', 'status'])
        );
    }

    public function reinstate(int $id): JsonResponse
    {
        return $this->ok(
            $this->users->setStatus($this->findInOrganisation($id), 'active')->only(['id', 'status'])
        );
    }

    /** 404 rather than 403 for another organisation's account: it should not
     *  be discoverable that the id exists at all. */
    protected function findInOrganisation(int $id): User
    {
        return User::query()
            ->where('organisation_id', app(Tenancy::class)->id())
            ->findOrFail($id);
    }
}
