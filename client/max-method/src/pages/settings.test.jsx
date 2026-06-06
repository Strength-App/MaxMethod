// Characterization tests for src/pages/settings.jsx (Risk #11 — Rules of Hooks).
//
// Settings has a known Rules-of-Hooks hazard: an `if (!user) return ...` early
// return sits BEFORE the page's useEffect, so the hook-call count changes when
// `user` flips from null to populated. These tests pin the two stable states
// (null → "Not logged in"; populated → the profile shell loads) and the effect
// firing discipline (once when a user is present, never when null). The
// null→populated TRANSITION — the case that actually trips React's hook-order
// check — is added alongside the fix, since it cannot pass against the
// unmodified (buggy) component.
//
// recharts is stubbed: its ResponsiveContainer needs ResizeObserver (not in
// the jsdom setup), and the charts are irrelevant to the hook-order contract.
//
// .test.jsx per #test-file-extension-convention.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server.js';
import { UserProvider } from '../context/UserContext';
import { API_URL } from '../config/api.js';
import Settings from './settings.jsx';

// Stub recharts so chart rendering doesn't reach ResizeObserver.
vi.mock('recharts', () => {
  const Passthrough = ({ children }) => <div>{children}</div>;
  const Empty = () => null;
  return {
    ResponsiveContainer: Passthrough,
    LineChart: Passthrough,
    Line: Empty,
    XAxis: Empty,
    YAxis: Empty,
    Tooltip: Empty,
    CartesianGrid: Empty,
  };
});

// Track how many times Settings' profile fetch fires.
let profileHits = 0;
function stubProfile(body = { firstName: 'Ada' }, status = 200) {
  server.use(
    http.get(`${API_URL}/api/users/profile/:id`, () => {
      profileHits += 1;
      return HttpResponse.json(body, { status });
    }),
  );
}

function renderSettings({ initialUser = null } = {}) {
  if (initialUser) localStorage.setItem('user', JSON.stringify(initialUser));
  return render(
    <UserProvider>
      <Settings />
    </UserProvider>,
  );
}

beforeEach(() => {
  profileHits = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('settings — render states', () => {
  it('shows "Not logged in" when there is no user', () => {
    renderSettings({ initialUser: null });
    expect(screen.getByRole('alert')).toHaveTextContent(/not logged in/i);
  });

  it('loads and shows the profile shell for a logged-in user', async () => {
    stubProfile({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' });
    renderSettings({ initialUser: { _id: 'u-1', email: 'ada@example.com' } });
    expect(await screen.findByRole('heading', { name: 'Profile', level: 1 })).toBeInTheDocument();
  });
});

describe('settings — effect firing discipline', () => {
  // Exact fetch counts aren't asserted: UserProvider's own bootstrap also
  // GETs /profile and its setUser re-triggers Settings' [user] effect, so the
  // count is a property of the provider stack, not Settings' hook order. What
  // matters for Risk #11 is the asymmetry below — the effect runs for a user
  // and is skipped entirely (zero fetches) when there's none.
  it("fetches the user's profile when logged in", async () => {
    stubProfile();
    renderSettings({ initialUser: { _id: 'u-1', email: 'ada@example.com' } });
    await screen.findByRole('heading', { name: 'Profile', level: 1 });
    expect(profileHits).toBeGreaterThanOrEqual(1);
  });

  it('does not fetch the profile when there is no user', async () => {
    stubProfile();
    renderSettings({ initialUser: null });
    // The "Not logged in" alert is synchronous; awaiting it also lets any stray
    // effect flush before we assert that none fetched.
    await screen.findByRole('alert');
    expect(profileHits).toBe(0);
  });
});
