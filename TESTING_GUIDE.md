# MaxMethod — Testing Guide

A manual testing playbook covering every major flow in the app. Use this before releases, after big refactors, or when onboarding new contributors. Each section lists the steps, the expected result, and common edge cases to verify.

---

## Table of Contents

1. [Test Environment Setup](#1-test-environment-setup)
2. [Smoke Test (5-Minute Sanity Check)](#2-smoke-test-5-minute-sanity-check)
3. [Authentication](#3-authentication)
4. [Onboarding & Classification](#4-onboarding--classification)
5. [Goals](#5-goals)
6. [Program Selection](#6-program-selection)
7. [Workout Day & Logger](#7-workout-day--logger)
8. [Customizing Workouts](#8-customizing-workouts)
9. [Exercise Library & Custom Exercises](#9-exercise-library--custom-exercises)
10. [History & Analytics](#10-history--analytics)
11. [Settings](#11-settings)
12. [Backend API Testing](#12-backend-api-testing)
13. [Edge Cases & Regression](#13-edge-cases--regression)
14. [Cross-Browser & Responsive](#14-cross-browser--responsive)
15. [Bug Reporting Template](#15-bug-reporting-template)

---

## 1. Test Environment Setup

### Prerequisites
- Node.js 18+
- MongoDB Atlas connection string (test cluster preferred — never test against prod)
- Backend `.env` configured with `MONGO_URI`, `EMAIL_USER`, `EMAIL_PASS`, `PORT=5050`

### Starting the Stack

```bash
# Terminal 1 — Backend
cd C:\Users\trist\MaxMethodBackendStructure\Backend_structure
npm install
npm run dev

# Terminal 2 — Frontend
cd C:\Users\trist\MaxMethodApp\client\max-method
npm install
npm run dev
```

Frontend: `http://localhost:5173` · Backend: `http://localhost:5050`

### Verify Stack Is Live
- Backend log shows `Server running on port 5050` and `MongoDB connected`.
- Frontend loads the welcome page without console errors.
- DevTools → Network → `POST /api/users/login` should resolve (even on failure) — confirms proxy is routing.

### Test Accounts

Create at least three:
| Account | Purpose |
|---|---|
| **Fresh user** | New signup, no profile data |
| **Mid-program user** | Active program, several logged sessions |
| **Long-history user** | Completed programs, PRs, custom exercises |

Reset by deleting the user document in MongoDB or by creating a new account with a different email.

---

## 2. Smoke Test (5-Minute Sanity Check)

Run this before every release. If any step fails, **stop and fix** before deeper testing.

- [ ] Welcome page loads, no console errors
- [ ] Sign up with new email succeeds
- [ ] Log out, log back in successfully
- [ ] Onboarding → classification → goals flow completes
- [ ] Pick a program and start it
- [ ] Open today's workout, log one set, save
- [ ] Open History — logged set appears
- [ ] Log out

If all green, the core path works.

---

## 3. Authentication

### Sign Up

| Test | Steps | Expected |
|---|---|---|
| Happy path | Welcome → Sign Up → enter valid email + password → submit | Redirects to onboarding; user document created in DB |
| Duplicate email | Sign up with an email already in use | Error message, no duplicate user |
| Weak password | Submit short password (<6 chars) | Validation error displayed |
| Invalid email format | Submit `notanemail` | Validation error displayed |
| Empty fields | Submit blank form | Validation errors on each required field |

### Login

| Test | Steps | Expected |
|---|---|---|
| Happy path | Enter valid credentials | Redirect to home, profile loads |
| Wrong password | Enter wrong password | Error: invalid credentials |
| Unknown email | Enter unregistered email | Error: invalid credentials (don't reveal which is wrong) |
| Empty fields | Submit blank | Validation errors |

### Session Persistence

- [ ] Log in, refresh the page → still logged in (UserContext rehydrates from localStorage)
- [ ] Log out → localStorage cleared, redirect to welcome
- [ ] Open in second tab while logged in → second tab is also logged in

### Password Change

- [ ] Settings → Change Password → old password correct + new password → success
- [ ] Wrong old password → rejected
- [ ] Log out and log in with new password → works

---

## 4. Onboarding & Classification

### Onboarding Flow

- [ ] All steps progress in order; back button returns to previous step
- [ ] Required fields can't be skipped
- [ ] Bodyweight and height accept reasonable ranges only (e.g., 50–500 lb, 4–7 ft)
- [ ] Gender selection persists into classification logic

### Classification

| Test | Input | Expected Tier |
|---|---|---|
| Beginner male @ 180lb | Bench 95, Squat 135, DL 185 | Beginner |
| Intermediate male @ 180lb | Bench 225, Squat 315, DL 405 | Intermediate or Advanced |
| Elite male @ 180lb | Bench 350, Squat 500, DL 600 | Elite |
| Beginner female @ 140lb | Bench 65, Squat 95, DL 135 | Beginner |

Verify the same totals classify differently across bodyweights — heavier lifters need more weight to hit the same tier.

### Edge Cases
- [ ] Submit zero for a lift → rejected, "enter your best estimate"
- [ ] Submit absurdly high (e.g., 9999 lb) → either rejected or capped
- [ ] Re-take classification → tier updates; future weight predictions reflect it

---

## 5. Goals

- [ ] Each goal option (build muscle, get stronger, lose weight, general fitness) saves correctly
- [ ] Target bodyweight only appears when weight loss/gain is selected
- [ ] Updating goal does **not** wipe an active program
- [ ] Goal change is reflected in next program-pick filtering

---

## 6. Program Selection

### Browsing

- [ ] Pick New Program loads program cards
- [ ] Filters by goal, days/week, equipment work as expected
- [ ] Empty filter combos show a "no programs match" state, not a crash

### Review & Start

- [ ] Tapping a program opens Review Program
- [ ] Sample week shows realistic exercises and rep schemes
- [ ] **Start Program** creates a workout log in the DB and sets it active
- [ ] Backing out of Review does *not* start the program

### Switching & Deselecting

- [ ] Active program → pick a new one → old program archived to history, new one active
- [ ] Deselect active program → home shows "no active program" state
- [ ] Re-activate from history → resumes correctly (not reset to week 1 unless explicitly chosen)

### Deletion

- [ ] Delete archived program → removed from history
- [ ] Cannot delete currently active program without first deselecting (or deletion deactivates it — verify behavior)

---

## 7. Workout Day & Logger

### Day View

- [ ] Today's exercises display with prescribed sets/reps/weight
- [ ] Weight predictions look reasonable for user's tier (not 1 lb, not 1000 lb)
- [ ] Days off / rest days display correctly
- [ ] Day filter only shows days with titles (per existing fix — confirm this still holds)

### Logging Sets

| Test | Steps | Expected |
|---|---|---|
| Log a single set | Enter weight + reps → save | Set appears as logged, color-coded as completed |
| Log all sets | Log every set in an exercise | Exercise marked complete |
| Edit a logged set | Tap a logged set, change reps, save | Updates in place, no duplicate |
| Skip an exercise | Move to next without logging | Exercise stays "pending" |
| Complete day | All sets logged → Complete Workout | Day locks, history updated, next day unlocks |

### Performance Adjustments
- [ ] Log significantly more reps than prescribed → next session's weight should trend up
- [ ] Log significantly fewer reps → next session's weight should hold or drop
- [ ] Verify weight predictor uses logged history (check `userWeightHistory` in DB)

### Quick Sessions
- [ ] No active program → Home offers Quick Session
- [ ] Add ad-hoc exercises, log sets, save → appears in history under quick-sessions

---

## 8. Customizing Workouts

### Custom Day (no DB save until commit)

> Per existing constraint: `customDay.jsx` must NOT auto-save during new workout creation.

- [ ] Build a custom day from scratch → no DB writes happen until user explicitly commits
- [ ] Refresh mid-creation → unsaved work is gone (acceptable; just verify no orphan records)
- [ ] Commit → record persists

### Swap Exercise (Single Day)
- [ ] Swap an exercise on Day 3 → only Day 3 is affected; future weeks still show original
- [ ] Verify swapped exercise inherits sets/reps from the slot

### Swap Exercise (All Weeks)
- [ ] Swap across all weeks from Week 2 onwards (verify whether it changes past or only future weeks — match expected behavior)
- [ ] Past logged sessions are NOT mutated retroactively

### Slot Replacement
- [ ] Replace exercise in a specific slot → other slots untouched

### Custom Workout (saved template)
- [ ] Build, save, run a custom workout
- [ ] Shows up in custom workout list for re-use
- [ ] Logging into a custom workout writes to history correctly

---

## 9. Exercise Library & Custom Exercises

### Library

- [ ] All exercises load with cards
- [ ] Video plays on each card
- [ ] Search/filter by muscle group and equipment works
- [ ] Tapping a card opens detail view with full demo

### Custom Exercises

- [ ] Add a custom exercise (name, category, equipment) → appears in library marked as custom
- [ ] Custom exercise is selectable in custom workouts and day swaps
- [ ] Delete custom exercise → removed from library; existing workouts that referenced it should still display the historical name (verify graceful handling)
- [ ] Try to add duplicate name → rejected or merged (verify behavior)

---

## 10. History & Analytics

### History Page

- [ ] All past sessions appear in reverse chronological order
- [ ] Filter by date range works
- [ ] Filter by exercise works (shows only sessions containing that exercise)
- [ ] Tapping a session shows full set-by-set log

### Personal Bests

- [ ] Log a heaviest-ever weight → PR registered
- [ ] PR list shows current bests per exercise per rep range
- [ ] Beating a PR replaces the old one; doesn't duplicate

### Charts (Recharts)

- [ ] Volume-over-time chart renders without errors
- [ ] Estimated 1RM trend lines look smooth (no wild spikes from one-set outliers)
- [ ] Empty state displays when user has no logged data
- [ ] Charts are responsive on mobile widths

---

## 11. Settings

- [ ] Update bodyweight → reflected in next weight prediction
- [ ] Update equipment access → next program filter respects it
- [ ] Re-take classification from Settings → tier updates correctly
- [ ] Change password (covered in §3)
- [ ] Log out → localStorage cleared, redirect to welcome

---

## 12. Backend API Testing

Use Postman, Insomnia, or `curl`. Base URL: `http://localhost:5050/api/users`.

### Quick Reference

```bash
# Create account
curl -X POST http://localhost:5050/api/users/create-account \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test"}'

# Login
curl -X POST http://localhost:5050/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Get profile
curl http://localhost:5050/api/users/profile/<userId>

# Get active workout
curl http://localhost:5050/api/users/workout/<userId>
```

### What to Verify Per Endpoint

- [ ] **Status codes** — 200/201 on success, 400 on bad input, 401 on auth fail, 404 on missing
- [ ] **Response shape** matches what the frontend expects
- [ ] **Idempotency** where applicable (PATCH the same value twice → no error)
- [ ] **No PII leakage** — login error messages don't reveal whether email exists
- [ ] **Password hashes** — never returned in responses (check `/profile/:userId`)

### Critical Endpoints to Hit

- `POST /classification` — verify each tier with sample inputs (see §4 table)
- `PATCH /workout/log` — log a set, confirm DB updated
- `PATCH /workout-log/:id/swap-exercise-all-weeks` — verify only correct weeks affected
- `GET /workout/:userId/personal-bests` — confirm PR computation is correct
- `DELETE /:userId/custom-exercises/:name` — confirm cascade behavior

---

## 13. Edge Cases & Regression

### Known Past Issues (must stay fixed)

- [ ] **Day display filter** uses title-only check — days without titles do not render
- [ ] **customDay.jsx** does not auto-save to DB during new workout creation
- [ ] **Review program page** sits between generation and home (verify routing)
- [ ] **Weight loss target weight** behaves correctly (regression target)
- [ ] **Daily logging** works when no program is selected (Quick Session)
- [ ] **Custom exercise tracking** end-to-end (add → use → log → history)
- [ ] **Profile page analytics** charts render with real data

### General Edge Cases

- [ ] User with zero logged workouts → home / history / charts handle empty state
- [ ] User with hundreds of sessions → history page paginates or scrolls smoothly (no jank)
- [ ] Network drop mid-log → error toast, log retry on reconnect (or graceful failure)
- [ ] Very long custom exercise names → truncated in UI, full name in DB
- [ ] Special characters in names (`'`, `"`, emoji) → no SQL/Mongo injection, no render breakage
- [ ] Switch user mid-session (different account in same browser) → previous user's data fully cleared

---

## 14. Cross-Browser & Responsive

### Browsers
Test the smoke path (§2) on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest, Mac)
- [ ] Edge (latest)

### Viewports
- [ ] Mobile (375×667 — iPhone SE)
- [ ] Mobile (390×844 — iPhone 14)
- [ ] Tablet (768×1024 — iPad)
- [ ] Desktop (1440×900)
- [ ] Wide (1920×1080)

### Responsive Checks
- [ ] No horizontal scroll on any viewport
- [ ] Tap targets ≥ 44×44 px on mobile
- [ ] Charts scale to container width
- [ ] Modals are usable on small screens (no off-screen content)
- [ ] Forms are usable with mobile keyboard open

---

## 15. Bug Reporting Template

When you find a bug, capture:

```markdown
**Title:** [Short description]

**Environment:**
- Browser: Chrome 120 / Firefox / Safari
- Viewport: Desktop / Mobile (375px)
- Account state: Fresh / Mid-program / Long-history

**Steps to Reproduce:**
1. ...
2. ...
3. ...

**Expected:**
[What should happen]

**Actual:**
[What actually happened]

**Console errors:**
[Paste any console output]

**Network failures:**
[Paste failed request URL + status code]

**Screenshot / video:**
[Attach]
```

---

## Pre-Release Checklist

Run through this before merging to main or shipping a release:

- [ ] §2 smoke test passes
- [ ] §3 auth flows (signup, login, password change)
- [ ] §6 program selection happy path
- [ ] §7 workout logging happy path
- [ ] §10 history reflects new logged data
- [ ] §13 known regressions still pass
- [ ] §14 mobile viewport (375px) — no horizontal scroll, all CTAs reachable
- [ ] No console errors on any page
- [ ] No 4xx/5xx responses in network tab on happy paths

If all green — ship it.
