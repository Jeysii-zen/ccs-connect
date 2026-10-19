<?php

namespace App\Services;

use App\Enums\AttendanceStatus;
use App\Enums\ProofStatus;
use App\Models\Event;
use Illuminate\Support\Carbon;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Writer;

/**
 * Event Participation Report (questionnaire Q39/Q40, DFD 6.3–6.6). Built on
 * demand from the event and its registrations; nothing is stored. Attendance
 * is read through effectiveAttendanceStatus(), so the report matches the
 * Participants page, manual changes included.
 */
class EventReportService
{
    /**
     * @return array{
     *     event: Event,
     *     location: string,
     *     generated_at: Carbon,
     *     totals: array<string, int>,
     *     proof: array{submitted: int, approved: int, rejected: int}|null,
     *     attendance_rate: float|null,
     *     groups: list<array{year: string, block: string, registered: int, attended: int, absent: int}>
     * }
     */
    public function build(Event $event, ?Carbon $now = null): array
    {
        $now ??= now();
        $event->loadMissing('location');

        $registrations = $event->registrations()
            ->get(['registration_id', 'year_level_at_registration', 'block_at_registration', 'proof_status',
                'proof_photo_path', 'qr_checked_in_at', 'attendance_status', 'attendance_modified_at']);

        $totals = array_fill_keys(['registered', 'attended', 'absent', 'pending', 'incomplete'], 0);
        $groups = [];

        foreach ($registrations as $registration) {
            $status = $registration->effectiveAttendanceStatus($event, $now);
            $key = $registration->year_level_at_registration.'|'.$registration->block_at_registration;

            $groups[$key] ??= [
                'year' => $registration->year_level_at_registration,
                'block' => $registration->block_at_registration,
                'registered' => 0,
                'attended' => 0,
                'absent' => 0,
            ];

            $totals['registered']++;
            $totals[strtolower($status)]++;
            $groups[$key]['registered']++;

            if ($status === AttendanceStatus::ATTENDED->value) {
                $groups[$key]['attended']++;
            } elseif ($status === AttendanceStatus::ABSENT->value) {
                $groups[$key]['absent']++;
            }
        }

        ksort($groups, SORT_NATURAL);

        return [
            'event' => $event,
            'location' => $event->location ? $this->locationLabel($event->location->toArray()) : 'No location',
            'generated_at' => $now,
            'totals' => $totals,
            'proof' => $event->proof_photo_required ? [
                'submitted' => $registrations->whereNotNull('proof_photo_path')->count(),
                'approved' => $registrations->where('proof_status', ProofStatus::APPROVED->value)->count(),
                'rejected' => $registrations->where('proof_status', ProofStatus::REJECTED->value)->count(),
            ] : null,
            'attendance_rate' => $totals['registered'] > 0
                ? round($totals['attended'] / $totals['registered'] * 100, 1)
                : null,
            'groups' => array_values($groups),
        ];
    }

    /**
     * Writes the report as an .xlsx file at $path.
     *
     * @param  array<string, mixed>  $report  from build()
     */
    public function writeSpreadsheet(array $report, string $path): void
    {
        /** @var Event $event */
        $event = $report['event'];

        $rows = [
            ['Event Participation Report'],
            [],
            ['Event title', $event->title],
            ['Date', $event->event_date->format('F j, Y')],
            ['Time', $event->startsAt()->format('g:i A').' – '.$event->endsAt()->format('g:i A')],
            ['Location', $report['location']],
            ['Target participants', $event->target_participants],
            ['Generated', $report['generated_at']->format('F j, Y g:i A')],
            [],
            ['Total registered', $report['totals']['registered']],
            ['Total attendees', $report['totals']['attended']],
            ['Total absentees', $report['totals']['absent']],
            ['Pending', $report['totals']['pending']],
            ['Incomplete', $report['totals']['incomplete']],
            ['Attendance rate (%)', $report['attendance_rate'] ?? '—'],
        ];

        if ($report['proof'] !== null) {
            $rows[] = ['Proof submitted', $report['proof']['submitted']];
            $rows[] = ['Proof approved', $report['proof']['approved']];
            $rows[] = ['Proof rejected', $report['proof']['rejected']];
        }

        $rows[] = [];
        $rows[] = ['Year', 'Section', 'Registered', 'Attendees', 'Absentees'];

        foreach ($report['groups'] as $group) {
            $rows[] = [$group['year'], $group['block'], $group['registered'], $group['attended'], $group['absent']];
        }

        $writer = new Writer;
        $writer->openToFile($path);

        foreach ($rows as $row) {
            $writer->addRow(Row::fromValues($row));
        }

        $writer->close();
    }

    /**
     * Same wording as locationLabel() in resources/js/lib/eventDisplay.js.
     *
     * @param  array<string, mixed>  $location
     */
    private function locationLabel(array $location): string
    {
        $details = array_filter([
            $location['building'] ?? null,
            ($location['floor'] ?? null) ? 'Floor '.$location['floor'] : null,
            ($location['room_number'] ?? null) ? 'Room '.$location['room_number'] : null,
        ]);

        return $details
            ? $location['location_name'].' · '.implode(', ', $details)
            : $location['location_name'];
    }
}
