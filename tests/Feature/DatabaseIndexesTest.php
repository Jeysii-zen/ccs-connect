<?php

use Illuminate\Support\Facades\Schema;

test('list queries have their indexes', function (string $table, array $columns) {
    $indexed = collect(Schema::getIndexes($table))->pluck('columns')->all();

    expect($indexed)->toContain($columns);
})->with([
    'scheduled announcements' => ['announcements', ['announcement_status', 'scheduled_at']],
    'published announcements' => ['announcements', ['announcement_status', 'published_at']],
    'account lists' => ['users', ['account_status', 'role', 'last_name', 'first_name']],
    'public event list' => ['events', ['event_status', 'event_date']],
    'participants by proof status' => ['event_registrations', ['event_id', 'proof_status']],
]);
