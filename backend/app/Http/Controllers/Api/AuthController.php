<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends ApiController
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['sometimes', 'string', 'max:120'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            // One message for both cases, so the response cannot be used to
            // discover which addresses are registered.
            throw ValidationException::withMessages([
                'email' => ['These credentials do not match our records.'],
            ]);
        }

        if ($user->status !== 'active') {
            throw ValidationException::withMessages([
                'email' => ['This account is not active.'],
            ]);
        }

        if (! $user->is_platform_admin && ! $user->organisation?->isActive()) {
            throw ValidationException::withMessages([
                'email' => ['This organisation is suspended.'],
            ]);
        }

		if ($user->operator_id && ! $user->operator?->isActive()) {
            throw ValidationException::withMessages([
                'email' => ['This operator is no longer active.'],
            ]);
        }
		
        $user->forceFill(['last_login_at' => now()])->save();

        return $this->ok([
            'token' => $user->createToken($credentials['device_name'] ?? 'api')->plainTextToken,
            'user' => $this->userPayload($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return $this->message('Signed out.');
    }

    public function me(Request $request): JsonResponse
    {
        return $this->ok($this->userPayload($request->user()));
    }

    protected function userPayload(User $user): array
    {
        $user->loadMissing(['organisation', 'trade']);

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'employee_code' => $user->employee_code,
            'is_platform_admin' => $user->is_platform_admin,
            'trade' => $user->trade?->only(['id', 'code', 'name']),
            'organisation' => $user->organisation?->only(['id', 'code', 'name', 'type']),
            'roles' => method_exists($user, 'getRoleNames') ? $user->getRoleNames() : [],
        ];
    }
}
