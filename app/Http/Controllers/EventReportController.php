<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Services\EventReportService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Event Participation Report (Admin/Faculty workflow "Generate Report",
 * SSD7-A/B): an HTML preview, then a PDF or Excel export. Faculty only for
 * their own events, Admin for all (EventPolicy::view).
 */
class EventReportController extends Controller
{
    public function __construct(private readonly EventReportService $reports) {}

    public function show(Event $event, string $format): Response
    {
        Gate::authorize('view', $event);

        $report = $this->reports->build($event);
        $filename = 'participation-report-'.$event->event_id.'-'.Str::slug($event->title);

        return match ($format) {
            // Subsetting embeds only the glyphs used (~850 KB -> ~22 KB).
            'pdf' => Pdf::loadView('reports.event-participation', $report)
                ->setOption('isFontSubsettingEnabled', true)
                ->download("{$filename}.pdf"),
            'xlsx' => $this->spreadsheet($report, "{$filename}.xlsx"),
            default => response()->view('reports.event-participation', $report),
        };
    }

    /**
     * @param  array<string, mixed>  $report
     */
    private function spreadsheet(array $report, string $filename): Response
    {
        $path = tempnam(sys_get_temp_dir(), 'report');
        $this->reports->writeSpreadsheet($report, $path);

        return response()->download($path, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend();
    }
}
