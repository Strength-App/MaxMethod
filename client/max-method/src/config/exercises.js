/**
 * Centralized exercise data.
 *
 * Four data maps used across the app's exercise-aware surfaces:
 *   - `MOVEMENT_PATTERNS`     pattern label → ordered exercise alternatives
 *   - `EXERCISE_EQUIPMENT`    exercise name → equipment label (passive lookup)
 *   - `PATTERN_MUSCLES`       pattern label → muscle-fill colors for body diagram
 *   - `VIDEO_NAME_ALIASES`    exercise name → mux video name (fallback alias)
 *
 * Sourced from `pages/exerciseLibrary.jsx`, `pages/reviewProgram.jsx`, and
 * `pages/day.jsx`. The same maps were inlined across those files (or some
 * subset of them) at Batch 3's starting commit. This module is the
 * consolidated canonical home. The original files retain their inline
 * copies until their own batches migrate to consume from here:
 * `reviewProgram.jsx` in Batch 11, `exerciseLibrary.jsx` in Batch 12,
 * `day.jsx` in Batch 15. **No call-site updates in Batch 3.**
 *
 * **Within-file dedup framing.** The original files' inline maps contain
 * 32 within-file duplicate keys total (22 in `exerciseLibrary.jsx`, 10
 * in `reviewProgram.jsx`). The consolidated maps below have those dupes
 * removed. Every original duplicate held identical values on both sides
 * (always `'Bodyweight'` → `'Bodyweight'`), so the dedup produces no
 * observable behavior change. See
 * `docs/decisions.md#within-file-key-duplication-finding` (amended) and
 * `docs/comparisons/exercise-map-truth-table.md` for the full evidence.
 * The `no-dupe-keys` suppressions on the two source files don't shrink
 * in Batch 3; they shrink in Batches 11/12 when those files migrate to
 * consume this module and the inline duplicates physically go away.
 *
 * **Cross-consumer alias note.** `exerciseLibrary.jsx` defines a local
 * `EXERCISE_NAME_ALIASES` map ({ 'squats': 'Squat', 'back squat': 'Squat' })
 * that normalizes program-data names before lookup. `reviewProgram.jsx`
 * and `day.jsx` don't normalize — they look up `EXERCISE_EQUIPMENT[name]`
 * with the raw name directly. To serve all three consumer patterns,
 * `EXERCISE_EQUIPMENT` below includes `'Squats'` and `'Back Squat'` as
 * keys (both → `'Barbell'`) alongside the canonical `'Squat'` and
 * `'Deadlift'` keys. `exerciseLibrary`'s aliasing layer continues to
 * redundantly normalize names that are already present here — harmless.
 *
 * **`MOVEMENT_PATTERNS['Squat Pattern']` asymmetry.** The 9-entry array
 * below matches `exerciseLibrary.jsx`'s version, not `reviewProgram.jsx`'s
 * 11-entry version. The asymmetry is real: `exerciseLibrary.jsx`'s
 * `buildExerciseList` iterates these arrays to generate library cards
 * (one card per name per pattern), so including alias names like
 * `'Squats'` and `'Back Squat'` would produce duplicate cards. The
 * 9-entry version is the canonical iteration shape. `reviewProgram.jsx`
 * needs the 2 alias entries in its array for the swap-UI; until it
 * migrates in Batch 11 it retains its inline 11-entry definition. The
 * deferred consumer-shape question is tracked at
 * `docs/follow-ups.md#reviewprogram-movement-patterns-alias-strategy`.
 *
 * Pure data — no runtime side effects, no imports.
 */

// ─── MOVEMENT_PATTERNS ───────────────────────────────────────────────────────
//
// Pattern label → ordered list of exercise alternatives. Used in two
// shapes by consumers:
//   - Iteration (exerciseLibrary's buildExerciseList): one card per name.
//   - Lookup (reviewProgram/day swap-UI): MOVEMENT_PATTERNS[label] for
//     the user's pick list.
//
// Verbatim from exerciseLibrary.jsx's 9-entry 'Squat Pattern' (see header).

export const MOVEMENT_PATTERNS = {
  'Horizontal Push':             ['Bench Press','Incline Bench Press','Decline Bench Press','Floor Press'],
  'Vertical Push':               ['Military Press','Seated Military Press','Push Press'],
  'Unilateral Push':             ['DB Incline Bench','DB Flat Bench','DB Shoulder Press','Arnold Press','DB Floor Press'],
  'Tricep Accessory':            ['Dips','Weighted Dips','Skullcrushers','Tricep Pushdowns','Tricep Extensions','Dip Machine','Overhead Tricep Extensions','One Arm Extensions','Close Grip Bench Press'],
  'Shoulder Accessory':          ['Front Raises','Lateral Raises','Cable Lateral Raises','Upright Rows','Face Pulls','Band Pull Aparts'],
  'Chest Accessory':             ['Chest Fly Machine','DB Chest Flys','Pushups','Weighted Pushups','Floor Chest Flys','Incline Chest Flys','Cable Chest Flys','Low to High Cable Flys'],
  'Push Machine':                ['Chest Press Machine','Shoulder Press Machine','Decline Press Machine','Incline Press Machine'],
  'Vertical Pull':               ['Neutral Grip Pullups','Weighted Neutral Grip Pullups','Pullups','Weighted Pull Ups','Chin Ups','Weighted Chin Ups','Lat Pulldowns','Close Grip Lat Pulldowns','Wide Grip Lat Pulldowns','Single Arm Pulldowns'],
  'Horizontal Pull':             ['Barbell Row','Underhand Barbell Row','Cable Row','T Bar Rows','Single Arm Cable Rows','Single Arm Dumbbell Rows','Chest Supported Row','Seal Row','Pendlay Row'],
  'Posterior Upper Accessory':   ['Scarecrows','Rear Delt Flys','Machine Rear Delt Flys','Pullovers','Cable Pullovers','Shrugs','DB Shrugs','Trap Bar Shrugs','YTWLs'],
  'Bicep Accessory':             ['DB Curls','Barbell Curls','Ez Bar Curls','Hammer Curls','Preacher Curls','Cable Curls','Rope Curls','Incline DB Curls','Concentration Curls','Cross Body Hammer Curls'],
  'Hinge':                       ['Deadlift','Hip Thrusts','Bodyweight Hip Thrusts','RDLs','Trap Bar Deadlifts','Barbell Glute Bridges','Bodyweight Glute Bridges','Single Leg RDLs','Sumo Deadlift','Good Mornings'],
  'Squat Pattern':               ['Squat','Front Squat','SSB Squats','Box Squats','Bodyweight Squat','Pendulum Squat','Leg Press','Goblet Squat','Zercher Squat'],
  'Posterior Chain Accessory':   ['Back Extensions','Bodyweight Back Extensions','Nordics','Reverse Hypers','GHD Raises','Single Leg Hip Thrusts'],
  'Unilateral Lower':            ['Bulgarians','Bodyweight Bulgarians','Walking Lunges','Bodyweight Lunges','ATG Lunges','Bodyweight ATG Lunges','Reverse Lunges','Step Ups'],
  'Isolation Lower':             ['Leg Extensions','Single Leg Extensions','Seated Leg Curls','Lying Leg Curls','Abductor Machine','Adductor Machine'],
  'Calves & Shins':              ['Single Leg Calf Raises','Calf Raise Machine','Seated Calf Raises','Bodyweight Calf Raises','Weighted Calf Raises','Donkey Calf Raises','Tibia Raises','Tibia Curls','Banded Tibia Curls'],
  'Machine Lower':               ['Leg Press','Hack Squat','Hack Squat Machine','Pendulum Squat','Reverse Hack Squat'],
  'Core':                        ['Plank','Ab Wheel Rollouts','Hanging Leg Raises','Cable Crunches','Decline Crunches','Pallof Press','Dead Bugs','Suitcase Carries','Farmer Carries'],
  'Bodyweight Strength Upper':   ['Pushups','Incline Pushups','Diamond Pushups','Wide Pushups','Dips','Pullups','Chin Ups','Neutral Grip Pullups','Inverted Bodyweight Row','Burpees'],
  'Bodyweight Lower':            ['Bodyweight Squat','Bodyweight Lunges','Bodyweight ATG Lunges','Bodyweight Bulgarians','Bodyweight Hip Thrusts','Bodyweight Glute Bridges','Bodyweight Back Extensions','Nordics','GHD Raises','Bodyweight Calf Raises'],
  'Cardio':                      ['Treadmill','Curved Treadmill','Assault Bike','Bike','Recumbent Bike','Elliptical','Stairmaster','Rowing Machine','Ski Erg'],
};

// ─── EXERCISE_EQUIPMENT ──────────────────────────────────────────────────────
//
// Exercise name → equipment label. Consumed via passive lookup at every
// site (exerciseLibrary's buildExerciseList equipment column, reviewProgram's
// equipment pill rendering, day's swap-UI). 154-key superset across the
// three source maps after dedup of the 22 + 10 within-file duplicates;
// includes 'Squats' and 'Back Squat' as keys so consumers that don't
// normalize through aliases (reviewProgram, day) get coverage.

export const EXERCISE_EQUIPMENT = {
  // Horizontal Push
  'Bench Press': 'Barbell', 'Incline Bench Press': 'Barbell', 'Decline Bench Press': 'Barbell', 'Floor Press': 'Barbell',
  // Vertical Push
  'Military Press': 'Barbell', 'Seated Military Press': 'Barbell', 'Push Press': 'Barbell',
  // Unilateral Push
  'DB Incline Bench': 'Dumbbell', 'DB Flat Bench': 'Dumbbell', 'DB Shoulder Press': 'Dumbbell', 'Arnold Press': 'Dumbbell', 'DB Floor Press': 'Dumbbell',
  // Tricep Accessory
  'Dips': 'Bodyweight', 'Weighted Dips': 'Dumbbell', 'Skullcrushers': 'Barbell', 'Tricep Pushdowns': 'Cable',
  'Tricep Extensions': 'Cable', 'Dip Machine': 'Machine', 'Overhead Tricep Extensions': 'Cable',
  'One Arm Extensions': 'Dumbbell', 'Close Grip Bench Press': 'Barbell',
  // Shoulder Accessory
  'Front Raises': 'Dumbbell', 'Lateral Raises': 'Dumbbell', 'Cable Lateral Raises': 'Cable',
  'Upright Rows': 'Barbell', 'Face Pulls': 'Cable', 'Band Pull Aparts': 'Dumbbell',
  // Chest Accessory
  'Chest Fly Machine': 'Machine', 'DB Chest Flys': 'Dumbbell', 'Pushups': 'Bodyweight', 'Weighted Pushups': 'Dumbbell',
  'Floor Chest Flys': 'Dumbbell', 'Incline Chest Flys': 'Dumbbell', 'Cable Chest Flys': 'Cable', 'Low to High Cable Flys': 'Cable',
  // Push Machine
  'Chest Press Machine': 'Machine', 'Shoulder Press Machine': 'Machine', 'Decline Press Machine': 'Machine', 'Incline Press Machine': 'Machine',
  // Vertical Pull
  'Neutral Grip Pullups': 'Bodyweight', 'Weighted Neutral Grip Pullups': 'Dumbbell', 'Pullups': 'Bodyweight', 'Weighted Pull Ups': 'Dumbbell',
  'Chin Ups': 'Bodyweight', 'Weighted Chin Ups': 'Dumbbell', 'Lat Pulldowns': 'Cable', 'Close Grip Lat Pulldowns': 'Cable',
  'Wide Grip Lat Pulldowns': 'Cable', 'Single Arm Pulldowns': 'Cable',
  // Horizontal Pull
  'Barbell Row': 'Barbell', 'Underhand Barbell Row': 'Barbell', 'Cable Row': 'Cable', 'T Bar Rows': 'Barbell',
  'Single Arm Cable Rows': 'Cable', 'Single Arm Dumbbell Rows': 'Dumbbell', 'Chest Supported Row': 'Machine',
  'Seal Row': 'Barbell', 'Pendlay Row': 'Barbell',
  // Posterior Upper Accessory
  'Scarecrows': 'Dumbbell', 'Rear Delt Flys': 'Dumbbell', 'Machine Rear Delt Flys': 'Machine', 'Pullovers': 'Dumbbell',
  'Cable Pullovers': 'Cable', 'Shrugs': 'Barbell', 'DB Shrugs': 'Dumbbell', 'Trap Bar Shrugs': 'Barbell', 'YTWLs': 'Dumbbell',
  // Bicep Accessory
  'DB Curls': 'Dumbbell', 'Barbell Curls': 'Barbell', 'Ez Bar Curls': 'Barbell', 'Hammer Curls': 'Dumbbell',
  'Preacher Curls': 'Barbell', 'Cable Curls': 'Cable', 'Rope Curls': 'Cable', 'Incline DB Curls': 'Dumbbell',
  'Concentration Curls': 'Dumbbell', 'Cross Body Hammer Curls': 'Dumbbell',
  // Hinge
  'Hip Thrusts': 'Barbell', 'Bodyweight Hip Thrusts': 'Bodyweight', 'RDLs': 'Barbell', 'Trap Bar Deadlifts': 'Barbell',
  'Barbell Glute Bridges': 'Barbell', 'Bodyweight Glute Bridges': 'Bodyweight', 'Single Leg RDLs': 'Dumbbell',
  'Sumo Deadlift': 'Barbell', 'Good Mornings': 'Barbell',
  // Squat Pattern (with 'Squats' / 'Back Squat' aliases for non-normalizing consumers)
  'Squat': 'Barbell', 'Front Squat': 'Barbell', 'SSB Squats': 'Barbell', 'Squats': 'Barbell', 'Back Squat': 'Barbell', 'Box Squats': 'Barbell',
  'Bodyweight Squat': 'Bodyweight', 'Pendulum Squat': 'Machine', 'Leg Press': 'Machine', 'Goblet Squat': 'Dumbbell', 'Zercher Squat': 'Barbell',
  // Posterior Chain Accessory
  'Back Extensions': 'Machine', 'Bodyweight Back Extensions': 'Bodyweight', 'Nordics': 'Bodyweight', 'Reverse Hypers': 'Machine',
  'GHD Raises': 'Bodyweight', 'Single Leg Hip Thrusts': 'Barbell',
  // Unilateral Lower
  'Bulgarians': 'Dumbbell', 'Bodyweight Bulgarians': 'Bodyweight', 'Walking Lunges': 'Dumbbell', 'Bodyweight Lunges': 'Bodyweight',
  'ATG Lunges': 'Dumbbell', 'Bodyweight ATG Lunges': 'Bodyweight', 'Reverse Lunges': 'Dumbbell', 'Step Ups': 'Dumbbell',
  // Isolation Lower
  'Leg Extensions': 'Machine', 'Single Leg Extensions': 'Machine', 'Seated Leg Curls': 'Machine', 'Lying Leg Curls': 'Machine',
  'Abductor Machine': 'Machine', 'Adductor Machine': 'Machine',
  // Calves & Shins
  'Single Leg Calf Raises': 'Dumbbell', 'Calf Raise Machine': 'Machine', 'Seated Calf Raises': 'Machine', 'Bodyweight Calf Raises': 'Bodyweight',
  'Weighted Calf Raises': 'Dumbbell', 'Donkey Calf Raises': 'Machine', 'Tibia Raises': 'Bodyweight', 'Tibia Curls': 'Machine', 'Banded Tibia Curls': 'Bodyweight',
  // Machine Lower
  'Hack Squat': 'Machine', 'Hack Squat Machine': 'Machine', 'Reverse Hack Squat': 'Machine',
  // Core
  'Plank': 'Bodyweight', 'Ab Wheel Rollouts': 'Bodyweight', 'Hanging Leg Raises': 'Bodyweight', 'Cable Crunches': 'Cable',
  'Decline Crunches': 'Bodyweight', 'Pallof Press': 'Cable', 'Dead Bugs': 'Bodyweight', 'Suitcase Carries': 'Dumbbell', 'Farmer Carries': 'Dumbbell',
  // Cardio
  'Treadmill': 'Cardio Machine', 'Curved Treadmill': 'Cardio Machine', 'Assault Bike': 'Cardio Machine', 'Bike': 'Cardio Machine',
  'Recumbent Bike': 'Cardio Machine', 'Elliptical': 'Cardio Machine', 'Stairmaster': 'Cardio Machine', 'Rowing Machine': 'Cardio Machine', 'Ski Erg': 'Cardio Machine',
  // Fixed template exercises
  'Deadlift': 'Barbell',
  // Additional bodyweight exercises (new to this consolidation; the source files
  // had these alongside 22 + 10 dupes, all of which dedup to the entries above)
  'Incline Pushups': 'Bodyweight', 'Diamond Pushups': 'Bodyweight', 'Wide Pushups': 'Bodyweight',
  'Inverted Bodyweight Row': 'Bodyweight', 'Burpees': 'Bodyweight', 'Banded Tibia Raises': 'Bodyweight',
};

// ─── PATTERN_MUSCLES ─────────────────────────────────────────────────────────
//
// Pattern label → muscle-fill colors used by exerciseLibrary's BodyDiagram
// SVG. Verbatim from the single source site.

export const PATTERN_MUSCLES = {
  'Horizontal Push':           { chest: '#cc0404', shoulders: 'rgba(204,4,4,0.4)',  triceps:  'rgba(204,4,4,0.25)' },
  'Vertical Push':             { shoulders: '#cc0404', traps: 'rgba(204,4,4,0.4)',  triceps:  'rgba(204,4,4,0.3)'  },
  'Unilateral Push':           { chest: '#cc0404', shoulders: 'rgba(204,4,4,0.45)', triceps:  'rgba(204,4,4,0.25)' },
  'Tricep Accessory':          { triceps: '#cc0404', chest: 'rgba(204,4,4,0.12)' },
  'Shoulder Accessory':        { shoulders: '#cc0404', traps: 'rgba(204,4,4,0.35)' },
  'Chest Accessory':           { chest: '#cc0404', shoulders: 'rgba(204,4,4,0.2)' },
  'Push Machine':              { chest: '#cc0404', shoulders: 'rgba(204,4,4,0.3)',  triceps:  'rgba(204,4,4,0.2)'  },
  'Vertical Pull':             { lats: '#cc0404', biceps: 'rgba(204,4,4,0.5)',      traps:    'rgba(204,4,4,0.3)'  },
  'Horizontal Pull':           { lats: '#cc0404', traps: 'rgba(204,4,4,0.45)',      biceps:   'rgba(204,4,4,0.35)' },
  'Posterior Upper Accessory': { traps: '#cc0404', shoulders: 'rgba(204,4,4,0.4)', lats:     'rgba(204,4,4,0.25)' },
  'Bicep Accessory':           { biceps: '#cc0404', forearms: 'rgba(204,4,4,0.4)' },
  'Hinge':                     { hamstrings: '#cc0404', glutes: 'rgba(204,4,4,0.65)', lats:  'rgba(204,4,4,0.2)'  },
  'Squat Pattern':             { quads: '#cc0404', glutes: 'rgba(204,4,4,0.5)',     hamstrings: 'rgba(204,4,4,0.2)' },
  'Posterior Chain Accessory': { hamstrings: '#cc0404', glutes: 'rgba(204,4,4,0.5)' },
  'Unilateral Lower':          { quads: '#cc0404', glutes: 'rgba(204,4,4,0.55)',   hamstrings: 'rgba(204,4,4,0.2)' },
  'Isolation Lower':           { hamstrings: '#cc0404', quads: 'rgba(204,4,4,0.3)' },
  'Calves & Shins':            { calves: '#cc0404' },
  'Machine Lower':             { quads: '#cc0404', glutes: 'rgba(204,4,4,0.4)' },
  'Core':                      { abs: '#cc0404', lats: 'rgba(204,4,4,0.15)' },
  'Bodyweight Strength Upper': { chest: '#cc0404', lats: 'rgba(204,4,4,0.5)', triceps: 'rgba(204,4,4,0.4)', shoulders: 'rgba(204,4,4,0.3)' },
  'Bodyweight Lower':          { quads: '#cc0404', glutes: 'rgba(204,4,4,0.6)', hamstrings: 'rgba(204,4,4,0.35)', calves: 'rgba(204,4,4,0.15)' },
  'Cardio':                    { quads: 'rgba(204,4,4,0.25)', hamstrings: 'rgba(204,4,4,0.2)', calves: 'rgba(204,4,4,0.2)' },
};

// ─── VIDEO_NAME_ALIASES ──────────────────────────────────────────────────────
//
// Frontend label → mongo video name. Covers cases the normalizers in
// exerciseLibrary.jsx's buildVideoLookup can't bridge automatically.
// Verbatim from the single source site.

export const VIDEO_NAME_ALIASES = {
  'Close Grip Lat Pulldowns': 'Close Grip Pulldowns',
};
