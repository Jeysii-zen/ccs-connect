<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') === 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Apply the theme before first paint: the saved choice, else the system setting. --}}
        <script>
            (function () {
                var appearance = @json($appearance ?? 'system');
                var dark = appearance === 'dark'
                    || (appearance === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                document.documentElement.classList.toggle('dark', dark);
            })();
        </script>

        <title inertia>{{ config('app.name', 'CCS Connect') }}</title>

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite('resources/js/app.jsx')
        @inertiaHead
    </head>

    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
