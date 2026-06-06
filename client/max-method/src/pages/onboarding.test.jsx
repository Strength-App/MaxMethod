// Characterization tests for src/pages/onboarding.jsx.
//
// Onboarding is the live three-step account-setup flow (createAcc routes
// here on success). It collects gender + bodyweight, a strength baseline
// (entered best set, beginner bodyweight-defaults, or skip), and training
// preferences, then hands the computed estimated 1RMs to /loading.
//
// Integration-shaped: real UserProvider in a MemoryRouter, with useNavigate
// mocked so tests can assert the destination + handed-off state without a
// real route table. window.alert is spied (the page uses it for inline
// validation). MSW backs the one fetch (PUT /update/:userId on skip).
//
// The estimated-1RM numbers asserted here are the Epley util's output
// (utils/epley.js — `floorTo5(estimateOneRepMax(...))`), shared with the
// OneRMCalc tool and the server's post-log estimate. Batch 9a unified
// onboarding onto this util; the prior percentage-table numbers (bench
// 110, squat 160) are noted alongside the new ones for the historical diff.
//
// .test.jsx per #test-file-extension-convention — the wrappers contain JSX.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server.js';
import { UserProvider } from '../context/UserContext';
import { API_URL } from '../config/api.js';
import Onboarding from './onboarding.jsx';

// useNavigate mock — assert the destination + state, not a real route table.
const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Render Onboarding inside a real UserProvider. A user is seeded into
// localStorage so submitOnboarding's `user.email` read has a value, and so
// the page renders the way the app renders it for a logged-in user.
function renderOnboarding() {
  localStorage.setItem('userId', 'u-1');
  localStorage.setItem('user', JSON.stringify({ _id: 'u-1', email: 'lifter@example.com' }));
  return render(
    <MemoryRouter>
      <UserProvider>
        <Onboarding />
      </UserProvider>
    </MemoryRouter>,
  );
}

// Fill step 1 (gender + bodyweight) and advance to step 2.
function completeStep1({ gender = 'male', bodyWeight = '180' } = {}) {
  fireEvent.click(screen.getByRole('radio', { name: new RegExp(`^${gender}$`, 'i') }));
  fireEvent.change(screen.getByLabelText(/body weight/i), { target: { value: bodyWeight } });
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
}

beforeEach(() => {
  mockNavigate.mockClear();
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('onboarding — step navigation + validation', () => {
  it('starts on step 1 with gender and body weight', () => {
    renderOnboarding();
    expect(screen.getByText('Tell us about yourself')).toBeInTheDocument();
    expect(screen.getByLabelText(/body weight/i)).toBeInTheDocument();
  });

  it('blocks advancing past step 1 until gender and body weight are filled', () => {
    renderOnboarding();
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('gender'));
    // Still on step 1.
    expect(screen.getByText('Tell us about yourself')).toBeInTheDocument();
  });

  it('advances to step 2 once step 1 is complete', () => {
    renderOnboarding();
    completeStep1();
    expect(screen.getByText('Your strength baseline')).toBeInTheDocument();
  });

  it('requires a baseline mode before leaving step 2', () => {
    renderOnboarding();
    completeStep1();
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('strength baseline'));
  });
});

describe('onboarding — estimated 1RM (Epley)', () => {
  // Each lift row shows a live "EST 1RM" readout computed from weight × reps.
  // The tests fill a single lift so its readout number is the only one on the
  // page, then assert that number directly. Numbers are `floorTo5(epley())`;
  // the old percentage-table value is noted for the historical diff.
  function enterBestSetMode() {
    renderOnboarding();
    completeStep1();
    fireEvent.click(screen.getByRole('radio', { name: /know my numbers/i }));
  }

  it('estimates bench from a 100×5 set as 115 lbs', () => {
    enterBestSetMode();
    fireEvent.change(screen.getByLabelText(/bench press weight/i), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/bench press reps/i), { target: { value: '5' } });
    // Epley: floorTo5(100 × (1 + 5/30)) = floorTo5(116.67) = 115. (Was 110.)
    expect(screen.getByText('115')).toBeInTheDocument();
  });

  it('estimates squat from a 150×3 set as 165 lbs', () => {
    enterBestSetMode();
    fireEvent.change(screen.getByLabelText(/squat weight/i), { target: { value: '150' } });
    fireEvent.change(screen.getByLabelText(/squat reps/i), { target: { value: '3' } });
    // Epley: floorTo5(150 × (1 + 3/30)) = floorTo5(165) = 165. (Was 160.)
    expect(screen.getByText('165')).toBeInTheDocument();
  });

  it('returns the weight unchanged for a true single (deadlift 200×1)', () => {
    enterBestSetMode();
    fireEvent.change(screen.getByLabelText(/deadlift weight/i), { target: { value: '200' } });
    fireEvent.change(screen.getByLabelText(/deadlift reps/i), { target: { value: '1' } });
    // reps === 1 returns the weight directly under both estimators: 200.
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('shows em-dash placeholders when reps are out of the 1–15 range', () => {
    enterBestSetMode();
    fireEvent.change(screen.getByLabelText(/bench press weight/i), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/bench press reps/i), { target: { value: '20' } });
    // No valid estimate rendered; all three readouts stay dashed.
    expect(screen.queryByText('115')).not.toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(3);
  });
});

describe('onboarding — submit hands computed maxes to /loading', () => {
  function completeStep3() {
    fireEvent.click(screen.getByRole('radio', { name: /3 days/i }));
    fireEvent.click(screen.getByRole('radio', { name: /strength/i }));
    fireEvent.click(screen.getByRole('button', { name: /begin my program/i }));
  }

  it('submits beginner bodyweight-defaults unchanged by the estimator', () => {
    renderOnboarding();
    completeStep1({ bodyWeight: '180' });
    fireEvent.click(screen.getByRole('radio', { name: /new to lifting/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    completeStep3();

    expect(mockNavigate).toHaveBeenCalledWith('/loading', expect.objectContaining({
      state: expect.objectContaining({
        source: 'onboarding',
        // Bodyweight multipliers: 180 × {0.30, 0.50, 0.75}.
        benchPress: 54,
        squat: 90,
        deadlift: 135,
      }),
    }));
  });

  it('submits entered-best-set maxes from the percentage table', () => {
    renderOnboarding();
    completeStep1({ bodyWeight: '180' });
    fireEvent.click(screen.getByRole('radio', { name: /know my numbers/i }));
    fireEvent.change(screen.getByLabelText(/bench press weight/i), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/bench press reps/i), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/squat weight/i), { target: { value: '150' } });
    fireEvent.change(screen.getByLabelText(/squat reps/i), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/deadlift weight/i), { target: { value: '200' } });
    fireEvent.change(screen.getByLabelText(/deadlift reps/i), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    completeStep3();

    expect(mockNavigate).toHaveBeenCalledWith('/loading', expect.objectContaining({
      state: expect.objectContaining({
        // Epley: bench 115, squat 165, deadlift 200. (Was 110/160/200.)
        benchPress: 115,
        squat: 165,
        deadlift: 200,
      }),
    }));
  });
});

describe('onboarding — skip path', () => {
  it('saves the profile and goes home when the user skips the baseline', async () => {
    let putBody = null;
    server.use(
      http.put(`${API_URL}/api/users/update/:userId`, async ({ request }) => {
        putBody = await request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    renderOnboarding();
    completeStep1({ gender: 'female', bodyWeight: '150' });
    fireEvent.click(screen.getByRole('button', { name: /skip strength baseline/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/home', { replace: true }));
    expect(putBody).toEqual({ gender: 'female', bodyWeight: '150' });
  });
});
