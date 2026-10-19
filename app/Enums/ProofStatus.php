<?php

namespace App\Enums;

/**
 * Proof photo states (questionnaire Q28).
 *
 * PENDING covers both "waiting for the student's upload" (no photo yet)
 * and "uploaded, waiting for review". EXPIRED is derived once the upload
 * window closes without a submitted or approved photo; see
 * EventRegistration::effectiveProofStatus().
 */
enum ProofStatus: string
{
    case NOT_REQUIRED = 'NOT_REQUIRED';
    case PENDING = 'PENDING';
    case APPROVED = 'APPROVED';
    case REJECTED = 'REJECTED';
    case EXPIRED = 'EXPIRED';
}
