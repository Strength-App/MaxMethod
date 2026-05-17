/**
 * MSW server (Node bindings) for the Vitest test environment.
 *
 * Constructed once; lifecycle managed in ../setup.js via beforeAll
 * /afterEach/afterAll hooks. Tests import this same `server` instance
 * to add per-test handler overrides:
 *
 *   import { server } from '../../test/msw/server.js';
 *   import { http, HttpResponse } from 'msw';
 *
 *   beforeEach(() => {
 *     server.use(
 *       http.get('/api/users/workout/:userId', () =>
 *         HttpResponse.json({ weeks: [...] })
 *       )
 *     );
 *   });
 *
 * `server.resetHandlers()` (in setup.js's afterEach) restores the
 * default handler list — currently empty — between tests.
 */
import { setupServer } from 'msw/node';
import { handlers } from './handlers.js';

export const server = setupServer(...handlers);
