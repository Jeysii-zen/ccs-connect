<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Services\ImageOptimizer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The signed-in user's own profile. Users may change their email and
 * profile picture; official details (name, student number / faculty ID,
 * year level, block) are managed by the CCS administrator.
 *
 * Accounts cannot be deleted or deactivated here: deactivation needs
 * admin approval, requested in person at the CCS department office
 * (questionnaire Q10/Q11).
 */
class ProfileController extends Controller
{
    private const PICTURE_DIRECTORY = 'profile-pictures';

    public function edit(Request $request): Response
    {
        return Inertia::render('Profile/Edit', [
            'status' => session('status'),
        ]);
    }

    public function update(ProfileUpdateRequest $request, ImageOptimizer $imageOptimizer): RedirectResponse
    {
        $user = $request->user();
        $validated = $request->validated();
        $picture = $request->profilePicture();

        $oldPicture = $user->profile_picture_path;
        $newPicture = $picture
            ? $imageOptimizer->store($picture, self::PICTURE_DIRECTORY, 'public', 'profile_picture')
            : null;

        $removing = ! $newPicture && $request->boolean('remove_profile_picture');

        try {
            DB::transaction(function () use ($user, $validated, $newPicture, $removing): void {
                $user->email = $validated['email'];

                if ($newPicture) {
                    $user->profile_picture_path = $newPicture;
                } elseif ($removing) {
                    $user->profile_picture_path = null;
                }

                $user->save();
            });
        } catch (\Throwable $exception) {
            if ($newPicture) {
                Storage::disk('public')->delete($newPicture);
            }

            throw $exception;
        }

        // The old picture is removed only once the new state is saved.
        if ($oldPicture && ($newPicture || $removing) && $oldPicture !== $newPicture) {
            Storage::disk('public')->delete($oldPicture);
        }

        return Redirect::route('profile.edit')->with('success', 'Profile updated successfully.');
    }
}
