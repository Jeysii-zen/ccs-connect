<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Real-time online status: every signed-in, active user joins while a page
// is open and leaves when the last tab closes. Members are identified only
// by an opaque key (User::getAuthIdentifierForBroadcasting()); no names.
Broadcast::channel('online', fn (User $user) => $user->account_status === 'ACTIVE'
    ? ['key' => $user->getAuthIdentifierForBroadcasting()]
    : false);
