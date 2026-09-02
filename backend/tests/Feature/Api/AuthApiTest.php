<?php

namespace Tests\Feature\Api;

use App\Models\Organisation;

class AuthApiTest extends ApiTestCase
{
    public function test_valid_credentials_return_a_token(): void
    {
        $this->postJson('/api/login', [
            'email' => 'alpha@test.local',
            'password' => 'secret-password',
        ])
            ->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email', 'organisation']]);
    }

    /** The same message either way, so the endpoint cannot enumerate accounts. */
    public function test_a_wrong_password_and_an_unknown_email_read_the_same(): void
    {
        $wrongPassword = $this->postJson('/api/login', [
            'email' => 'alpha@test.local', 'password' => 'nope',
        ])->assertStatus(422);

        $unknownEmail = $this->postJson('/api/login', [
            'email' => 'nobody@test.local', 'password' => 'nope',
        ])->assertStatus(422);

        $this->assertSame(
            $wrongPassword->json('errors.email'),
            $unknownEmail->json('errors.email'),
        );
    }

    public function test_a_user_of_a_suspended_organisation_cannot_sign_in(): void
    {
        $this->alpha->update(['status' => Organisation::STATUS_SUSPENDED]);

        $this->postJson('/api/login', [
            'email' => 'alpha@test.local', 'password' => 'secret-password',
        ])->assertStatus(422);
    }

    public function test_me_returns_the_signed_in_user_with_their_organisation(): void
    {
        $this->actingAsApi($this->alphaUser)
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('organisation.code', 'ALPHA');
    }

    public function test_logout_revokes_the_token(): void
    {
        $token = $this->postJson('/api/login', [
            'email' => 'alpha@test.local', 'password' => 'secret-password',
        ])->json('token');

        $this->withHeader('Authorization', 'Bearer '.$token)->postJson('/api/logout')->assertOk();

        $this->assertSame(0, \Laravel\Sanctum\PersonalAccessToken::count());

        // The guard was resolved earlier in this test and cached the user, so
        // reset it before checking the revoked token is refused.
        $this->app['auth']->forgetGuards();

        $this->withHeader('Authorization', 'Bearer '.$token)->getJson('/api/me')->assertUnauthorized();
    }
}
