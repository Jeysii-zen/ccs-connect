<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoginAttempt extends Model
{
    protected $table = 'login_attempts';

    protected $primaryKey = 'login_attempt_id';

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'email_used',
        'was_successful',
        'attempted_at',
    ];

    protected function casts(): array
    {
        return [
            'was_successful' => 'boolean',
            'attempted_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }
}
