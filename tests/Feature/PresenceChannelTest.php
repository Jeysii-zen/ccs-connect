<?php

use App\Models\User;
use Illuminate\Broadcasting\BroadcastManager;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    // Tests run with the null broadcaster, which approves everything; use the
    // Reverb (Pusher protocol) driver so the channel rules really run.
    config([
        'broadcasting.default' => 'reverb',
        'broadcasting.connections.reverb.key' => 'test-key',
        'broadcasting.connections.reverb.secret' => 'test-secret',
        'broadcasting.connections.reverb.app_id' => 'test-app',
    ]);
    app(BroadcastManager::class)->purge();
    require base_path('routes/channels.php');
});

function joinOnline(): TestResponse
{
    return test()->postJson('/broadcasting/auth', [
        'socket_id' => '1234.5678',
        'channel_name' => 'presence-online',
    ]);
}

test('a signed-in user joins the online channel under an opaque key', function () {
    $user = User::factory()->create(['role' => 'student']);

    $this->actingAs($user);
    $data = json_decode(joinOnline()->assertOk()->json('channel_data'), true);

    expect($data['user_id'])
        ->toBe($user->getAuthIdentifierForBroadcasting())
        ->not->toBe((string) $user->id)
        ->and($data['user_info'])->toBe(['key' => $user->getAuthIdentifierForBroadcasting()])
        // No names, emails or student numbers reach other members.
        ->and(json_encode($data))->not->toContain($user->email)
        ->not->toContain($user->last_name);
});

test('guests cannot join the online channel', function () {
    joinOnline()->assertForbidden();
});

test('deactivated accounts cannot join the online channel', function () {
    $user = User::factory()->create(['account_status' => 'DEACTIVATED']);

    $this->actingAs($user);

    expect(joinOnline()->status())->toBeIn([401, 403]);
    $this->assertGuest();
});

test('presence keys are stable, unique and do not reveal the user id', function () {
    [$a, $b] = User::factory()->count(2)->create();

    expect($a->getAuthIdentifierForBroadcasting())
        ->toBe($a->fresh()->getAuthIdentifierForBroadcasting())
        ->not->toBe($b->getAuthIdentifierForBroadcasting())
        ->toMatch('/^[0-9a-f]{20}$/');
});

test('the accounts page gives each active account its presence key', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $student = User::factory()->create(['role' => 'student']);
    $faculty = User::factory()->create(['role' => 'faculty']);

    $this->actingAs($admin)
        ->get(route('admin.accounts.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('students.data.0.presence_key', $student->getAuthIdentifierForBroadcasting())
            ->where('faculty.data.0.presence_key', $faculty->getAuthIdentifierForBroadcasting()));
});
