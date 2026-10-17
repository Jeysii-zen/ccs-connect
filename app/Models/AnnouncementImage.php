<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnnouncementImage extends Model
{
    protected $primaryKey = 'announcement_image_id';

    public $timestamps = false;

    protected $fillable = [
        'announcement_id',
        'image_path',
    ];

    /**
     * @return BelongsTo<Announcement, $this>
     */
    public function announcement(): BelongsTo
    {
        return $this->belongsTo(
            Announcement::class,
            'announcement_id',
            'announcement_id'
        );
    }
}
