<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Announcement extends Model
{
    protected $primaryKey = 'announcement_id';

    protected $fillable = [
        'created_by_user_id',
        'title',
        'description_content',
        'announcement_date',
        'announcement_status',
        'published_at',
        'scheduled_at',
    ];

    protected function casts(): array
    {
        return [
            'announcement_date' => 'date',
            'published_at' => 'datetime',
            'scheduled_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /**
     * @return HasMany<AnnouncementImage, $this>
     */
    public function images(): HasMany
    {
        return $this->hasMany(
            AnnouncementImage::class,
            'announcement_id',
            'announcement_id'
        );
    }

    /**
     * @param  Builder<Announcement>  $query
     * @return Builder<Announcement>
     */
    public function scopePublished(Builder $query): Builder
    {
        return $query
            ->where('announcement_status', 'Published')
            ->whereNotNull('published_at');
    }
}
