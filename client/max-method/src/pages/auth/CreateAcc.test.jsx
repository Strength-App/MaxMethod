// Characterization tests for src/pages/createAcc.jsx.
//
// CreateAcc is the account-creation form: it POSTs the new account, seeds
// UserContext + WorkoutContext from the response, and forwards to onboarding.
// On a server error it surfaces the server's message via alert and re-enables
// the form.
//
// These pin the observable contract BEFORE Batch 9b migrates the request from
// axios to fetch — they're backed by MSW (which intercepts both axios's XHR
// and fetch), so the same tests stay green across the migration, proving the
// switch preserves behavior.
//
// Integration-shaped: real UserProvider + WorkoutProvider in a MemoryRouter,
// useNavigate mocked, window.alert spied, MSW backing the create-account POST.
//
// .test.jsx per #test-file-extension-convention.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw/server.js';
import { UserProvider } from '../../context/UserContext';
import { WorkoutProvider } from '../../context/WorkoutContext';
import { API_URL } from '../../config/api.js';
import CreateAcc from './CreateAcc.jsx';

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderCreateAcc() {
  return render(
    <MemoryRouter>
      <UserProvider>
        <WorkoutProvider>
          <CreateAcc />
        </WorkoutProvider>
      </UserProvider>
    </MemoryRouter>,
  );
}

function fillForm({ first = 'Ada', last = 'Lovelace', email = 'ada@example.com', password = 'pw12345' } = {}) {
  fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: first } });
  fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: last } });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: password } });
}

beforeEach(() => {
  mockNavigate.mockClear();
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('createAcc — successful creation', () => {
  it('seeds the session from the response and forwards to onboarding', async () => {
    let postBody = null;
    server.use(
      http.post(`${API_URL}/api/users/create-account`, async ({ request }) => {
        postBody = await request.json();
        return HttpResponse.json({ _id: 'u-9', firstName: 'Ada' }, { status: 201 });
      }),
    );
    renderCreateAcc();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/onboarding'));
    // setUserId persisted the new id for WorkoutContext / later reads.
    expect(localStorage.getItem('userId')).toBe('u-9');
    // The four form fields were sent.
    expect(postBody).toEqual({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', password: 'pw12345' });
  });
});

describe('createAcc — server error', () => {
  it("surfaces the server's message and does not navigate", async () => {
    server.use(
      http.post(`${API_URL}/api/users/create-account`, () =>
        HttpResponse.json({ message: 'Email already in use' }, { status: 400 }),
      ),
    );
    renderCreateAcc();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith('Email already in use'),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
    // The form re-enables so the user can retry.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /create account/i })).toBeEnabled(),
    );
  });
});
