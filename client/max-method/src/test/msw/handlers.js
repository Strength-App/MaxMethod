/**
 * MSW default request handlers.
 *
 * Empty at Batch 1 — there are no shared default handlers yet because
 * no tests exist. Tests written in later batches add per-test handlers
 * via `server.use(http.get(...))` inside individual test files (or
 * beforeEach blocks). The `server.resetHandlers()` call in afterEach
 * (see ../setup.js) undoes those per-test overrides so tests stay
 * isolated.
 *
 * When a per-test handler proves shared across multiple tests, lift it
 * here — typed as a constant in this file, or organized into per-domain
 * subfiles (e.g., `./workout.js`, `./auth.js`) re-exported here as the
 * surface grows. Keep this file minimal until duplication earns
 * extraction; premature handler sharing produces the same wrong-
 * abstraction failure mode as premature component sharing.
 *
 * Per docs/decisions.md#fetch-mocking.
 */
export const handlers = [];
