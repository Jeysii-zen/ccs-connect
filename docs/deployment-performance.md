# Deployment performance checklist

What the production server needs so CCS Connect stays fast. App-level work
(image compression, lazy loading, indexes, progress bar) is already in the
code; this list covers the server and hosting side.

## 1. PHP

Enable in `php.ini` (both are required):

```ini
extension=gd                  ; image resizing/WebP (ImageOptimizer)
zend_extension=opcache

opcache.enable=1
opcache.memory_consumption=128
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0  ; production: code only changes on deploy
```

With `validate_timestamps=0`, reload PHP-FPM after every deploy so new code
is picked up. Measured locally: OPcache cut page response time from ~800 ms
to ~70 ms.

Run PHP through PHP-FPM behind nginx (or Apache), not `php artisan serve`,
which handles one request at a time.

## 2. Laravel

`.env`:

```dotenv
APP_ENV=production
APP_DEBUG=false
```

On every deploy, in this order:

```bash
composer install --no-dev --optimize-autoloader
php artisan migrate --force
npm ci && npm run build      # minified, split, hashed assets
php artisan optimize          # caches config, routes, events, views
php artisan storage:link      # first deploy only
```

Run `php artisan optimize:clear` before `optimize` if a cached value looks
stale. Keep the scheduler (`php artisan schedule:run` every minute) and a
queue worker (`php artisan queue:work`) running.

Never run `npm run dev` or `composer run dev` on the server: that serves
unminified development files.

Once, after the first deploy that includes `ImageOptimizer`:

```bash
php artisan images:compress --dry-run   # see what would change
php artisan images:compress             # originals → storage/app/private/image-backups
```

## 3. Web server (nginx example)

```nginx
# Compress text responses (HTML, JSON page props, JS, CSS, SVG).
gzip on;
gzip_comp_level 5;
gzip_min_length 1024;
gzip_types text/plain text/css application/javascript application/json image/svg+xml;
# brotli on; brotli_types ...;   # if the ngx_brotli module is installed

# Vite assets have content hashes in their names: cache them for a year.
location /build/ {
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
    try_files $uri =404;
}

# Uploaded posters/announcement images (new uploads get new file names).
location /storage/ {
    expires 30d;
    add_header Cache-Control "public, max-age=2592000";
    try_files $uri =404;
}
```

Proof photos are private (`storage/app/private`) and served by Laravel with
`Cache-Control: private, no-store`; do not expose that folder.

Serve the site over HTTPS (HTTP/2 lets the browser download the page's
chunks in parallel).

## 4. CDN (optional)

Not needed for one college's traffic. If one is added later (e.g.
Cloudflare in front of the domain), static files are already CDN-friendly
thanks to the cache headers above. To serve `/build` from a separate CDN
host, set `ASSET_URL=https://cdn.example.edu` in `.env` and rebuild. Never
cache HTML pages or `/registrations/*/proof` at the CDN: they are per-user.

## 5. Not needed at this size

- **Load balancer**: one PHP-FPM server handles a department's traffic.
  Revisit if CPU stays high at peak (e.g. a campus-wide event check-in). It
  then also needs a shared session/cache store (next point) and shared
  storage for uploads.
- **Database connection pooling**: PHP opens one short connection per
  request, which MySQL handles fine here. Persistent connections cause
  more problems than they solve at this scale.
- **Redis**: sessions, cache and queue use the database today. Switch
  `SESSION_DRIVER`, `CACHE_STORE` and `QUEUE_CONNECTION` to `redis` if
  database load grows or a second web server is added.
