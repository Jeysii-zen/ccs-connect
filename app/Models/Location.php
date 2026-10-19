<?php

namespace App\Models;

use Database\Factories\LocationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Predefined campus location (developer-configured reference data).
 */
class Location extends Model
{
    /** @use HasFactory<LocationFactory> */
    use HasFactory;

    protected $primaryKey = 'location_id';

    public $timestamps = false;

    protected $fillable = [
        'location_name',
        'description',
        'building',
        'floor',
        'room_number',
    ];

    /**
     * @return HasMany<Event, $this>
     */
    public function events(): HasMany
    {
        return $this->hasMany(Event::class, 'location_id', 'location_id');
    }
}
