<?php

namespace App\Http\Controllers;

use App\Http\Requests\Proof\ReviewProofRequest;
use App\Http\Requests\Proof\StoreProofRequest;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Services\ProofService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProofController extends Controller
{
    public function __construct(
        private readonly ProofService $proofService
    ) {}

    public function store(StoreProofRequest $request, EventRegistration $registration): RedirectResponse
    {
        $this->proofService->submit($registration, $request->photo());

        return back()->with(
            'success',
            'Proof photo uploaded successfully. It is now waiting for approval.'
        );
    }

    /**
     * Streams a private proof photo to its owner or the event's managers.
     */
    public function show(EventRegistration $registration): StreamedResponse
    {
        Gate::authorize('viewProof', $registration);

        $path = $registration->proof_photo_path;

        abort_unless($path !== null && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path, null, [
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /**
     * {registration} is scoped to {event}, so a registration from another
     * event cannot be reviewed through this URL.
     */
    public function review(ReviewProofRequest $request, Event $event, EventRegistration $registration): RedirectResponse
    {
        $reviewer = $request->user();
        $version = $request->string('proof_version')->toString();

        if ($request->input('decision') === 'approve') {
            $this->proofService->approve($registration, $reviewer, $version);

            return back()->with('success', 'Proof photo approved.');
        }

        $this->proofService->reject(
            $registration,
            $reviewer,
            $version,
            $request->string('reason')->trim()->toString()
        );

        return back()->with('success', 'Proof photo rejected. The student can upload a new one.');
    }
}
