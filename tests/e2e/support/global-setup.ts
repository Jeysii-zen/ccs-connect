import { execFileSync } from 'node:child_process';

/**
 * Fresh, seeded ccs_connect_e2e database before every run (see
 * prepare-database.php for the safety checks).
 */
export default function globalSetup() {
    // Not 'inherit': under the Playwright MCP server stdout is the protocol
    // pipe, and the script's output there hangs the run. Errors still throw
    // with the script's stderr.
    execFileSync('php', ['tests/e2e/support/prepare-database.php'], { stdio: ['ignore', 'pipe', 'pipe'] });
}
