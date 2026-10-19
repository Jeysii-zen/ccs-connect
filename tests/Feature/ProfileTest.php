<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_page_is_displayed(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->get('/profile');

        $response->assertOk();
    }

    public function test_users_can_update_their_email(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'email' => 'new-address@example.com',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile')
            ->assertSessionHas('success', 'Profile updated successfully.');

        $this->assertSame('new-address@example.com', $user->refresh()->email);
    }

    public function test_official_details_cannot_be_changed_from_the_profile(): void
    {
        $user = User::factory()->create([
            'role' => 'student',
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'student_number' => '22-00-001',
            'year_level' => '3rd Year',
            'block_number' => 'BSIT-31',
        ]);

        $this->actingAs($user)->patch('/profile', [
            'email' => $user->email,
            'first_name' => 'Changed',
            'middle_name' => 'Changed',
            'last_name' => 'Changed',
            'student_number' => '99-99-999',
            'year_level' => '1st Year',
            'block_number' => 'X',
            'role' => 'admin',
        ])->assertSessionHasNoErrors();

        $user->refresh();

        $this->assertSame('Maria', $user->first_name);
        $this->assertSame('Santos', $user->last_name);
        $this->assertSame('22-00-001', $user->student_number);
        $this->assertSame('3rd Year', $user->year_level);
        $this->assertSame('BSIT-31', $user->block_number);
        $this->assertSame('student', $user->role);
    }

    public function test_users_cannot_delete_or_deactivate_their_own_account(): void
    {
        $user = User::factory()->create();

        $this
            ->actingAs($user)
            ->delete('/profile', ['password' => 'password'])
            ->assertMethodNotAllowed();

        $this->assertAuthenticatedAs($user);
        $this->assertSame('ACTIVE', $user->fresh()?->account_status);
    }
}
