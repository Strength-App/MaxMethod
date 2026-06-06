// Characterization tests for src/pages/welcomepage.jsx.
//
// Welcomepage is the sign-in screen: an email/password form that POSTs to
// /api/users/login, plus a "Create Account" button. On success it seeds
// UserContext + WorkoutContext and routes the user onward — to /home if
// their onboarding is finished, otherwise into the onboarding flow.
//
// Integration-shaped: real UserProvider + WorkoutProvider in a MemoryRouter,
// useNavigate mocked to assert destinations, window.alert spied (used for
// the failed-login message), MSW backing the /login POST (and the workout
// fetch that a completed-onboarding login triggers).
//
// .test.jsx per #test-file-extension-convention.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server.js';
import { UserProvider } from '../context/UserContext';
import { WorkoutProvider } from '../context/WorkoutContext';
import { API_URL } from '../config/api.js';
import Welcomepage from './welcomepage.jsx';

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderWelcome() {
  return render(
    <MemoryRouter>
      <UserProvider>
        <WorkoutProvider>
          <Welcomepage />
        </WorkoutProvider>
      </UserProvider>
    </MemoryRouter>,
  );
}

// Stub the login endpoint with a given JSON body, capturing the request body.
function stubLogin(responseBody, status = 200) {
  const captured = { body: null };
  server.use(
    http.post(`${API_URL}/api/users/login`, async ({ request }) => {
      captured.body = await request.json();
      return HttpResponse.json(responseBody, { status });
    }),
  );
  return captured;
}

function signIn({ email = 'a@b.com', password = 'pw' } = {}) {
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
}

beforeEach(() => {
  mockNavigate.mockClear();
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('welcomepage — form', () => {
  it('renders email, password, and both buttons', () => {
    renderWelcome();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('routes to account creation from the Create Account button', () => {
    renderWelcome();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/create-account');
  });
});

describe('welcomepage — login outcomes', () => {
  it('sends a completed-onboarding user home and seeds their session', async () => {
    stubLogin({ success: true, user: { _id: 'u-9', onboarding_complete: true } });
    renderWelcome();
    signIn();

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/home', { replace: true }),
    );
    // setUserId persisted the id for WorkoutContext / later reads.
    expect(localStorage.getItem('userId')).toBe('u-9');
  });

  it('sends an unfinished-onboarding user into onboarding', async () => {
    stubLogin({ success: true, user: { _id: 'u-7', onboarding_complete: false } });
    renderWelcome();
    signIn();

    // CURRENT behavior: routes to the (dead) /classification screen. Batch 9a's
    // fix repoints this to /onboarding when classification.jsx is removed.
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/classification', { replace: true }),
    );
  });

  it('alerts and stays put when login fails', async () => {
    stubLogin({ success: false, message: 'bad creds' });
    renderWelcome();
    signIn();

    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('bad creds')),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
