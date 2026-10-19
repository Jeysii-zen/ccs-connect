{{-- Event Participation Report (Q39). Rendered as the in-app preview and by
     dompdf for the PDF, so keep to tables and inline CSS (no flex/grid). --}}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Event Participation Report · {{ $event->title }}</title>
    <style>
        body { font-family: "DejaVu Sans", Arial, sans-serif; font-size: 12px; color: #0f172a; margin: 24px; background: #fff; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        h2 { font-size: 13px; margin: 20px 0 6px; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.06em; }
        .muted { color: #64748b; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        th { background: #f1f5f9; font-size: 11px; }
        .details th { width: 32%; background: none; color: #475569; font-weight: normal; }
        .num { text-align: right; }
        .rate { font-size: 16px; font-weight: bold; color: #1d4ed8; }
    </style>
</head>
<body>
    <h1>Event Participation Report</h1>
    <p class="muted">CCS Connect · Generated {{ $generated_at->format('F j, Y g:i A') }}</p>

    <h2>Event</h2>
    <table class="details">
        <tr><th>Event title</th><td>{{ $event->title }}</td></tr>
        <tr><th>Date</th><td>{{ $event->event_date->format('F j, Y') }}</td></tr>
        <tr><th>Time</th><td>{{ $event->startsAt()->format('g:i A') }} – {{ $event->endsAt()->format('g:i A') }}</td></tr>
        <tr><th>Location</th><td>{{ $location }}</td></tr>
        <tr><th>Target participants</th><td>{{ $event->target_participants }}</td></tr>
    </table>

    <h2>Participation</h2>
    <table class="details">
        <tr><th>Total registered</th><td>{{ $totals['registered'] }}</td></tr>
        <tr><th>Total attendees</th><td>{{ $totals['attended'] }}</td></tr>
        <tr><th>Total absentees</th><td>{{ $totals['absent'] }}</td></tr>
        @if ($totals['pending'] > 0 || $totals['incomplete'] > 0)
            <tr><th>Pending / incomplete</th><td>{{ $totals['pending'] }} / {{ $totals['incomplete'] }}</td></tr>
        @endif
        @if ($proof !== null)
            <tr><th>Proof submitted</th><td>{{ $proof['submitted'] }} ({{ $proof['approved'] }} approved, {{ $proof['rejected'] }} rejected)</td></tr>
        @endif
        <tr>
            <th>Attendance rate</th>
            <td class="rate">{{ $attendance_rate === null ? '—' : $attendance_rate.'%' }}</td>
        </tr>
    </table>
    <p class="muted">Attendance rate = attendees ÷ registered. Pending students can still check in or complete their proof.</p>

    <h2>By year and section</h2>
    @if ($groups === [])
        <p class="muted">No students have registered.</p>
    @else
        <table>
            <thead>
                <tr><th>Year</th><th>Section</th><th class="num">Registered</th><th class="num">Attendees</th><th class="num">Absentees</th></tr>
            </thead>
            <tbody>
                @foreach ($groups as $group)
                    <tr>
                        <td>{{ $group['year'] }}</td>
                        <td>{{ $group['block'] }}</td>
                        <td class="num">{{ $group['registered'] }}</td>
                        <td class="num">{{ $group['attended'] }}</td>
                        <td class="num">{{ $group['absent'] }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif
</body>
</html>
