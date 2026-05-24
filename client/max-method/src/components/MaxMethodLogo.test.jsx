// Characterization tests for src/components/MaxMethodLogo.jsx.
//
// MaxMethodLogo is D-classified: a pure presentational SVG brand mark. It has a
// SINGLE behavioral branch — the `animated` prop toggles the root class between
// `mm-logo` (CSS keyframe build-in plays) and `mm-logo mm-logo--static` (every
// element pinned at end-state, no animation). No state, no effects, no timers,
// no context, no fixtures, so there is nothing to layer per Rule #21 and no
// hazard pattern to choose — the simplest of the Batch 7 primitives, written
// first to establish the per-file rhythm.
//
// Queried by role: the SVG carries role="img" + aria-label, so getByRole('img',
// { name }) is the behavior-first handle (Rule #19 — RTL = behavior). The CSS
// animation itself is appearance, not behavior, and is out of scope here; only
// the class toggle (the JS branch) is pinned. The actual keyframes would be
// covered, if they regressed, by the manual visual-check batches (Batches
// 10–15, per docs/decisions.md#visual-regression).
//
// File extension is .test.jsx per docs/decisions.md#test-file-extension-convention.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MaxMethodLogo from './MaxMethodLogo.jsx';

const NAME = 'Max Method - Break the Standard';

describe('MaxMethodLogo — accessibility', () => {
  it('exposes the brand mark as a single named image', () => {
    render(<MaxMethodLogo />);
    expect(screen.getByRole('img', { name: NAME })).toBeInTheDocument();
  });
});

describe('MaxMethodLogo — animated/static class branch', () => {
  it('renders static (mm-logo--static) by default', () => {
    render(<MaxMethodLogo />);
    const svg = screen.getByRole('img', { name: NAME });
    expect(svg).toHaveClass('mm-logo', 'mm-logo--static');
  });

  it('renders static when animated={false}', () => {
    render(<MaxMethodLogo animated={false} />);
    const svg = screen.getByRole('img', { name: NAME });
    expect(svg).toHaveClass('mm-logo', 'mm-logo--static');
  });

  it('drops the --static modifier when animated', () => {
    render(<MaxMethodLogo animated />);
    const svg = screen.getByRole('img', { name: NAME });
    expect(svg).toHaveClass('mm-logo');
    expect(svg).not.toHaveClass('mm-logo--static');
  });
});
