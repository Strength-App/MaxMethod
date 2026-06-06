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
 * No imports, no I/O. The maps are pure data; the catalog section at the
 * bottom (relocated from exerciseLibrary in Batch 12) adds the pure builder
 * `buildExerciseList` and the `ALL_EXERCISES` / `ALL_EXERCISE_NAMES` it
 * derives once at module load.
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

// ---------------------------------------------------------------------------
// Derived catalog (relocated verbatim from pages/exerciseLibrary.jsx in
// Batch 12). buildExerciseList expands MOVEMENT_PATTERNS into one entry per
// name per pattern, attaching each entry's body region, primary muscle,
// muscle-fill colors, coaching cues, tips, and equipment from the maps above.
// ALL_EXERCISES is that expansion computed once at module load; ALL_EXERCISE_NAMES
// is its unique-name projection (consumed by the custom-exercise validity check
// and the exercise typeaheads). The PATTERN_* tables and body-region helpers
// are module-internal inputs to the builder.
// ---------------------------------------------------------------------------

// ─── Data ─────────────────────────────────────────────────────────────────────

const UPPER_PATTERNS = ['Horizontal Push','Vertical Push','Unilateral Push','Tricep Accessory','Shoulder Accessory','Chest Accessory','Push Machine','Vertical Pull','Horizontal Pull','Posterior Upper Accessory','Bicep Accessory','Bodyweight Strength Upper']
const LOWER_PATTERNS = ['Hinge','Squat Pattern','Posterior Chain Accessory','Unilateral Lower','Isolation Lower','Calves & Shins','Machine Lower','Bodyweight Lower']

function bodyOf(p) {
  if (UPPER_PATTERNS.includes(p)) return 'upper'
  if (LOWER_PATTERNS.includes(p)) return 'lower'
  if (p === 'Cardio') return 'cardio'
  return 'core'
}

const PATTERN_PRIMARY = {
  'Horizontal Push':           'Chest',
  'Vertical Push':             'Shoulders',
  'Unilateral Push':           'Chest / Shoulders',
  'Tricep Accessory':          'Triceps',
  'Shoulder Accessory':        'Shoulders',
  'Chest Accessory':           'Chest',
  'Push Machine':              'Chest / Shoulders',
  'Vertical Pull':             'Lats',
  'Horizontal Pull':           'Back',
  'Posterior Upper Accessory': 'Traps / Rear Delts',
  'Bicep Accessory':           'Biceps',
  'Hinge':                     'Hamstrings / Glutes',
  'Squat Pattern':             'Quads',
  'Posterior Chain Accessory': 'Hamstrings',
  'Unilateral Lower':          'Quads / Glutes',
  'Isolation Lower':           'Hamstrings / Quads',
  'Calves & Shins':            'Calves',
  'Machine Lower':             'Quads',
  'Core':                      'Core',
  'Bodyweight Strength Upper': 'Chest / Back / Triceps',
  'Bodyweight Lower':          'Quads / Glutes',
  'Cardio':                    'Cardiovascular System',
}

const PATTERN_STEPS = {
  'Horizontal Push': [
    { t: 'Setup',   d: 'Lie flat on the bench. <strong>Eyes under the bar</strong>, feet planted firmly. Retract and depress shoulder blades.' },
    { t: 'Grip',    d: 'Take a <strong>slightly wider than shoulder-width grip</strong>. Wrap thumbs around the bar securely.' },
    { t: 'Descent', d: 'Lower the bar in a slight arc to your <strong>lower chest</strong>. Elbows 45–75° from torso.' },
    { t: 'Press',   d: '<strong>Drive the bar back up</strong> explosively. Exhale at the top. Full lockout each rep.' },
    { t: 'Rack',    d: 'Return the bar to the uprights <strong>under control</strong>. Don\'t rush the re-rack.' },
  ],
  'Vertical Push': [
    { t: 'Stance',  d: 'Feet shoulder-width apart. Bar at <strong>clavicle height</strong>, grip just outside shoulders.' },
    { t: 'Brace',   d: '<strong>Squeeze glutes and brace core</strong> hard before pressing. This protects the lower back.' },
    { t: 'Press',   d: '<strong>Press bar overhead</strong> in a vertical path. Head shifts slightly forward as bar passes face.' },
    { t: 'Lockout', d: 'Lock elbows fully. Bar directly <strong>over mid-foot</strong> when viewed from the side.' },
    { t: 'Lower',   d: 'Control the bar back to clavicle. <strong>Stay tight</strong> the entire rep.' },
  ],
  'Unilateral Push': [
    { t: 'Setup',  d: 'Position the dumbbell(s) at shoulder height. <strong>Neutral or pronated grip</strong> depending on variation.' },
    { t: 'Brace',  d: '<strong>Engage your core</strong> firmly to prevent rotation or compensation on unilateral reps.' },
    { t: 'Press',  d: 'Drive the weight in a <strong>controlled arc or straight line</strong>. Full range of motion every rep.' },
    { t: 'Peak',   d: '<strong>Full extension at the top</strong>. Feel the muscle contracting — don\'t stop short.' },
    { t: 'Lower',  d: '<strong>Slow eccentric</strong> back to the start. Unilateral work builds symmetry — match reps each side.' },
  ],
  'Tricep Accessory': [
    { t: 'Setup',          d: '<strong>Position the load</strong> — overhead, at chest, or at the cable stack depending on variation.' },
    { t: 'Elbow position', d: '<strong>Lock upper arms in place</strong>. Only the forearm moves. This isolates the tricep completely.' },
    { t: 'Extend',         d: '<strong>Extend through the elbow</strong> fully. Tricep only fully contracts when the arm is straight.' },
    { t: 'Squeeze',        d: '<strong>Hard lockout pause</strong> at the end range. Hold briefly for maximum fiber recruitment.' },
    { t: 'Return',         d: 'Control the return. <strong>Feel the tricep stretch</strong> at the start position before the next rep.' },
  ],
  'Shoulder Accessory': [
    { t: 'Start',    d: 'Hold dumbbells or cables with a <strong>slight elbow bend</strong> throughout the movement.' },
    { t: 'Initiate', d: 'Lead with your <strong>elbows, not your hands</strong>. Think of the elbow driving the arc.' },
    { t: 'Raise',    d: '<strong>Lift to shoulder height</strong> — no higher. Going past parallel recruits traps, not delts.' },
    { t: 'Control',  d: '<strong>Don\'t swing</strong> the weight up. Slow and deliberate = more delt activation.' },
    { t: 'Lower',    d: '<strong>Resist on the way down</strong>. The eccentric phase builds the shoulder equally.' },
  ],
  'Chest Accessory': [
    { t: 'Setup',   d: 'Arms in a <strong>slight hugging arc</strong> with elbows softly bent. Chest up, shoulders back.' },
    { t: 'Stretch', d: 'Open arms wide, feeling a <strong>deep stretch across the chest</strong>. Don\'t overextend the shoulder.' },
    { t: 'Squeeze', d: '<strong>Bring hands together</strong> in a controlled arc — squeeze the pecs, not the arms.' },
    { t: 'Peak',    d: 'At the top, <strong>adduct slightly past center</strong> for full pectoral contraction.' },
    { t: 'Return',  d: 'Slow, controlled return to the stretch position. <strong>Constant tension on the chest</strong> throughout.' },
  ],
  'Push Machine': [
    { t: 'Adjust',  d: 'Set seat height so handles align with <strong>mid-chest or shoulder height</strong>. Back flat against pad.' },
    { t: 'Grip',    d: 'Grip handles with <strong>wrists stacked over elbows</strong>. Relaxed grip — let the chest do the work.' },
    { t: 'Press',   d: '<strong>Push away</strong> in a controlled motion. Full extension without locking out the joints.' },
    { t: 'Return',  d: 'Resist the weight <strong>on the way back</strong>. Don\'t let the stack crash. Full stretch at the start.' },
    { t: 'Breathe', d: '<strong>Exhale on the press, inhale on return</strong>. Steady rhythm throughout the set.' },
  ],
  'Vertical Pull': [
    { t: 'Hang',     d: '<strong>Dead hang</strong> from the bar or set the starting position. Full arm extension.' },
    { t: 'Initiate', d: '<strong>Depress shoulder blades</strong> before bending the elbows — pull shoulders away from ears.' },
    { t: 'Pull',     d: 'Drive <strong>elbows down and back</strong>. Think about pulling the bar or handles toward your chest.' },
    { t: 'Peak',     d: '<strong>Full contraction at the bottom</strong> — chest to bar, elbows past the torso if range allows.' },
    { t: 'Extend',   d: '<strong>Full arm extension every rep</strong>. No half reps — the stretch builds the lats.' },
  ],
  'Horizontal Pull': [
    { t: 'Hinge',   d: 'Bend over with a <strong>neutral spine</strong>. Torso roughly 45–90° depending on variation.' },
    { t: 'Grip',    d: '<strong>Firm grip shoulder-width or wider</strong>. Retract shoulder blades before pulling.' },
    { t: 'Pull',    d: '<strong>Drive elbows back and up</strong>, pulling to your abdomen or lower chest. Lead with elbows.' },
    { t: 'Squeeze', d: 'Hold the <strong>top position one beat</strong> — squeeze lats and rhomboids hard.' },
    { t: 'Lower',   d: '<strong>Controlled descent</strong>. Feel the lat stretch at the bottom of every rep.' },
  ],
  'Posterior Upper Accessory': [
    { t: 'Setup',    d: 'Use <strong>light weight with controlled range</strong>. Posterior work responds to feel, not load.' },
    { t: 'Initiate', d: 'Lead with the <strong>rear delt or trap</strong>. No momentum — these muscles are often skipped.' },
    { t: 'Range',    d: 'Move through <strong>full range of motion</strong>. These muscles respond to stretch more than most.' },
    { t: 'Squeeze',  d: '<strong>Pause at peak contraction</strong>. Give these often-undertrained muscles the attention they deserve.' },
    { t: 'Return',   d: '<strong>Slow eccentric</strong> back to start. Upper back thickness is built on the way down.' },
  ],
  'Bicep Accessory': [
    { t: 'Setup',   d: 'Hold with a <strong>supinated (palms up) grip</strong>. Upper arms fixed at your sides.' },
    { t: 'Curl',    d: '<strong>Curl upward by flexing the elbow</strong>. Supinate the wrist through the full range.' },
    { t: 'Peak',    d: '<strong>Squeeze the bicep hard</strong> at the top. Wrist slightly supinated at full flex.' },
    { t: 'Lower',   d: '<strong>Slow, controlled return</strong> to full extension. The eccentric is where most growth happens.' },
    { t: 'Stretch', d: '<strong>Full extension at the bottom</strong> every rep. Don\'t cut the range short.' },
  ],
  'Hinge': [
    { t: 'Hip hinge', d: 'Push hips back — <strong>not squat down</strong>. Keep the bar or load close to the body throughout.' },
    { t: 'Spine',     d: '<strong>Neutral spine from head to tailbone</strong>. Brace hard before you load the hinge.' },
    { t: 'Load',      d: 'Feel the <strong>hamstrings and glutes loading</strong> as you hinge. Stop at full stretch.' },
    { t: 'Drive',     d: '<strong>Drive hips forward</strong> to stand. Squeeze glutes hard at full lockout.' },
    { t: 'Reset',     d: '<strong>Full lockout at the top</strong> each rep. Controlled return with the same tension.' },
  ],
  'Squat Pattern': [
    { t: 'Stance',  d: 'Feet <strong>slightly wider than shoulder-width</strong>, toes out 15–30°. Find your natural stance.' },
    { t: 'Brace',   d: 'Big breath in, <strong>360° core brace</strong>. Squeeze glutes. Hold this through the whole rep.' },
    { t: 'Descent', d: 'Break at hips and knees simultaneously. <strong>Push knees over toes</strong>. Chest stays up.' },
    { t: 'Depth',   d: '<strong>Break parallel or below</strong> for full quad and glute development.' },
    { t: 'Drive',   d: '<strong>Push the floor away</strong>. Hips and shoulders rise at the same rate. Full lockout.' },
  ],
  'Posterior Chain Accessory': [
    { t: 'Setup',     d: 'Hips at the <strong>pivot point of the machine</strong> or hinge. Start in the lowered position.' },
    { t: 'Initiate',  d: 'Lead with <strong>glutes and hamstrings</strong>. Squeeze before the movement begins.' },
    { t: 'Extension', d: '<strong>Extend fully at the top</strong>. Glutes squeezed, hips fully extended.' },
    { t: 'Control',   d: '<strong>Don\'t hyperextend</strong> the lower back. Stop at fully upright.' },
    { t: 'Lower',     d: '<strong>Controlled descent</strong>. Feel the glutes and hamstrings stretching on the way down.' },
  ],
  'Unilateral Lower': [
    { t: 'Setup',   d: 'Set a <strong>correct split stance</strong> for the variation — front foot flat, back foot in position.' },
    { t: 'Brace',   d: '<strong>Core engaged, torso tall</strong>. Look forward. Shoulders back and down.' },
    { t: 'Descent', d: 'Lower with control. <strong>Front knee tracks over the toe</strong>. Back knee hovers above the floor.' },
    { t: 'Bottom',  d: 'Both knees near 90°. <strong>Front knee doesn\'t cave inward</strong>.' },
    { t: 'Drive',   d: '<strong>Push through the front heel</strong> to return. Complete all reps then switch sides.' },
  ],
  'Isolation Lower': [
    { t: 'Adjust',   d: 'Align the working joint with the <strong>machine\'s axis of rotation</strong> before you start.' },
    { t: 'Sit tall', d: '<strong>Upright posture</strong>, back against the pad. Don\'t lean into the movement.' },
    { t: 'Move',     d: '<strong>Full range, controlled pace</strong>. Isolation means no help — feel the target muscle working.' },
    { t: 'Peak',     d: '<strong>Pause and squeeze</strong> at full contraction. The targeted muscle should be fully loaded.' },
    { t: 'Return',   d: '<strong>Slow eccentric</strong> back to start. Isolation work lives and dies on the descent.' },
  ],
  'Calves & Shins': [
    { t: 'Setup',  d: 'Ball of foot on the <strong>edge of a step or platform</strong>. Heels free to travel full range.' },
    { t: 'Stretch', d: '<strong>Lower heels below the platform</strong> for a full stretch. Never skip this.' },
    { t: 'Rise',   d: '<strong>Push through the ball of the foot</strong> as high as possible. Pause at the top.' },
    { t: 'Hold',   d: '<strong>1–2 second pause</strong> at the top. Calves respond to peak contraction and high volume.' },
    { t: 'Lower',  d: '<strong>Slow, deliberate descent</strong>. No bouncing — the stretch at the bottom is where they grow.' },
  ],
  'Machine Lower': [
    { t: 'Adjust',         d: 'Set seat, back pad, and foot plate for your <strong>limb length</strong>. Alignment matters.' },
    { t: 'Foot position',  d: '<strong>Shoulder-width, toes slightly out</strong>. Higher foot = more glutes. Lower = more quads.' },
    { t: 'Move',           d: '<strong>Full range of motion</strong> every rep. Partials limit development significantly.' },
    { t: 'Control',        d: '<strong>No weight stack slamming</strong>. Resist through the full range — both directions.' },
    { t: 'Breathe',        d: '<strong>Exhale on the effort, inhale on return</strong>. Steady rhythm throughout.' },
  ],
  'Core': [
    { t: 'Brace',          d: '<strong>Brace the core 360°</strong> — outward pressure in all directions, not just sucking in.' },
    { t: 'Neutral spine',  d: '<strong>Maintain neutral spine</strong> throughout. Core work with a rounded back loses the benefit.' },
    { t: 'Initiate',       d: '<strong>Lead with the abs</strong>, not momentum. Slow and deliberate beats fast and sloppy.' },
    { t: 'Full range',     d: '<strong>Complete the full movement</strong>. Core exercises are often cut short, limiting effectiveness.' },
    { t: 'Breathe',        d: '<strong>Exhale on the effort</strong>. Holding breath during core work creates unnecessary tension.' },
  ],
  'Cardio': [
    { t: 'Setup',     d: 'Set your machine to a comfortable starting resistance or speed. <strong>Begin at a warm-up pace</strong> — don\'t start at full intensity.' },
    { t: 'Warm Up',   d: '<strong>Gradually increase intensity</strong> over the first 2–3 minutes. Let heart rate rise before hitting your target zone.' },
    { t: 'Effort',    d: 'Maintain your <strong>target intensity</strong>. Steady state: conversational pace, RPE 5–6. Intervals: push RPE 7–9 then recover fully.' },
    { t: 'Breathe',   d: '<strong>Rhythmic, controlled breathing</strong> throughout. Never hold your breath — exhale on the hardest effort phase.' },
    { t: 'Cool Down', d: 'Reduce intensity for the <strong>final 2–3 minutes</strong>. Let heart rate come down gradually — don\'t stop abruptly.' },
  ],
  'Bodyweight Strength Upper': [
    { t: 'Setup',    d: 'No equipment needed — <strong>position your body correctly</strong> for the variation. Hands, rings, or bar at the right width and height.' },
    { t: 'Brace',    d: '<strong>Full-body tension every rep</strong>. Core tight, glutes squeezed, legs straight or planted. Bodyweight work demands total-body rigidity.' },
    { t: 'Range',    d: '<strong>Full range of motion every rep</strong> — chest to floor on pushups, chin over bar on pullups. Partial reps are wasted reps.' },
    { t: 'Control',  d: '<strong>Slow the eccentric</strong> on the way down. Lower yourself with control — tempo and tension build more strength than rushing reps.' },
    { t: 'Volume',   d: 'These movements respond to <strong>density and quality reps</strong>. Push for max quality, rest minimally, and focus on what the muscle feels.' },
  ],
  'Bodyweight Lower': [
    { t: 'Setup',   d: 'Position yourself for the specific variation — squat, lunge, bridge, or hinge. <strong>No load doesn\'t mean no effort</strong>.' },
    { t: 'Brace',   d: '<strong>Core tight, neutral spine</strong>. Treat every bodyweight rep as seriously as a loaded one — technique is how you progress here.' },
    { t: 'Depth',   d: '<strong>Full range every time</strong>. Bodyweight work relies on full ROM for development — never cut depth short.' },
    { t: 'Drive',   d: '<strong>Push through the heel(s)</strong> to emphasize glutes and hamstrings. For squats and lunges — knee tracks over the toes.' },
    { t: 'Tension', d: 'Maintain <strong>active tension throughout</strong> — don\'t just fall into position. Control the descent and own the ascent.' },
  ],
}

const PATTERN_TIPS = {
  'Horizontal Push':           ['Arch upper back — keeps shoulders safe','Drive feet into the floor for leg drive','Tuck chin slightly on descent','Bar path is a slight arc, not straight down'],
  'Vertical Push':             ['Squeeze glutes to protect lower back','Flare elbows slightly at the bottom','Press face through at lockout','Keep the bar path as vertical as possible'],
  'Unilateral Push':           ['Match reps and effort on both sides','Single-arm work exposes imbalances — use it','Brace extra hard to prevent hip tilt','Slow the eccentric for more time under tension'],
  'Tricep Accessory':          ['Full lockout = full tricep contraction','Upper arms stay pinned — no drift','Lighter weight with full ROM beats heavy partials','Long head needs overhead stretch to fully develop'],
  'Shoulder Accessory':        ['Elbows slightly bent throughout — never locked','Raise to shoulder height only — not higher','Control the lowering — slow eccentrics build delts','Keep traps out of it — shoulders down'],
  'Chest Accessory':           ['Slight elbow bend throughout — no straight arms','Think of hugging, not pressing','Full stretch = more pec fiber recruitment','Squeeze past center at the top for full contraction'],
  'Push Machine':              ['Adjust seat height every session — it matters','Don\'t let weight stack touch at the bottom','Full ROM always beats heavier partial reps','Use to pre-fatigue or finish the muscle'],
  'Vertical Pull':             ['Initiate with scapular depression, not arm bend','Think: pull elbows to hips','Full dead hang at the bottom every rep','Hollow body position reduces swinging'],
  'Horizontal Pull':           ['Keep a neutral spine throughout','Pull in an arc, not straight up','Think "elbows to the ceiling"','Brace hard before every single rep'],
  'Posterior Upper Accessory': ['Light weight, high feel — these are detail muscles','Squeeze the target muscle before moving','Full range beats loading on accessory moves','Pair with face pulls for shoulder health'],
  'Bicep Accessory':           ['Supinate fully at the top for peak contraction','Full extension at the bottom — no half reps','Control the eccentric — it\'s where growth happens','Pin upper arms and isolate — no swinging'],
  'Hinge':                     ['Push hips back — don\'t think "bend over"','Bar stays close to the body throughout','Keep lats tight like protecting your armpits','Don\'t chase depth past where hamstrings are loaded'],
  'Squat Pattern':             ['Knees track over toes — always','Full breath before every rep','Break parallel for full quad and glute development','Bar position affects torso angle — experiment'],
  'Posterior Chain Accessory': ['Full hip extension at the top — no partial reps','Slow eccentrics = more hamstring recruitment','These protect the knees — don\'t skip them','Foundation for every big hinge lift you do'],
  'Unilateral Lower':          ['Long stride = more glute activation','Keep torso tall — no forward lean','Drive through the heel, not the toe','These expose weakness between legs — embrace it'],
  'Isolation Lower':           ['Alignment with the machine axis is critical','Full range matters more than load here','Pause at peak contraction for max fiber activation','Slow the eccentric — this is detail work'],
  'Calves & Shins':            ['Full range is non-negotiable — no partial reps','Pause at the top for full engagement','Slightly bent knee hits soleus more','Calves need high volume — 15–25 reps works best'],
  'Machine Lower':             ['Never fully lock knees out — takes load off the joint','Control the negative — growth happens here','Foot position changes muscle emphasis significantly','Don\'t let lower back lift off the pad'],
  'Core':                      ['Quality over quantity — 5 perfect reps beats 20 sloppy','Full body tension during every core movement','Exhale on the exertion phase','Core strength transfers directly to your big lifts'],
  'Bodyweight Strength Upper': ['Full range is non-negotiable — chest to floor, chin over bar','Hollow body position improves every bodyweight movement','Slow the eccentric — tempo builds more strength than speed','These movements build real-world, transferable upper body strength'],
  'Bodyweight Lower':          ['Full depth every rep — no shortcuts','Tempo matters more than load with bodyweight','Drive through the heel for maximum glute emphasis','High volume works well — bodyweight lower responds to density'],
  'Cardio':                    ['Keep heart rate in your target zone for your goal','Steady state: conversational pace — RPE 5–6','Intervals: push hard then recover fully before repeating','Hydrate before, during, and after every session','Consistency and frequency matter more than any single session'],
}

// ─── Build Exercise List ──────────────────────────────────────────────────────

function buildExerciseList() {
  const list = []
  for (const [pattern, names] of Object.entries(MOVEMENT_PATTERNS)) {
    for (const name of names) {
      list.push({
        id:        `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}__${pattern.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        name,
        pattern,
        body:      bodyOf(pattern),
        primary:   PATTERN_PRIMARY[pattern] || pattern,
        muscles:   PATTERN_MUSCLES[pattern] || {},
        steps:     PATTERN_STEPS[pattern]   || [],
        tips:      PATTERN_TIPS[pattern]    || [],
        equipment: EXERCISE_EQUIPMENT[name] || null,
      })
    }
  }
  return list
}

// The full exercise catalog: one card per name per pattern, computed once.
export const ALL_EXERCISES = buildExerciseList();

// Every distinct exercise name in the catalog, de-duplicated across patterns.
export const ALL_EXERCISE_NAMES = [...new Set(ALL_EXERCISES.map(e => e.name))];
