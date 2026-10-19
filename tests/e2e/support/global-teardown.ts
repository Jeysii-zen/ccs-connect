import { execFileSync } from 'node:child_process';

/** Deletes the files this run uploaded (see prepare-database.php). */
export default function globalTeardown() {
    execFileSync('php', ['tests/e2e/support/prepare-database.php', '--cleanup'], { stdio: ['ignore', 'pipe', 'pipe'] });
}
