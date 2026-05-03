import { useState, useMemo, useEffect } from 'react'
import MuxPlayer from '@mux/mux-player-react'
import { useWorkout } from '../context/WorkoutContext'
import './exerciseLibrary.css'
import { API_URL } from '../config/api';

// ─── Library Video Lookup ─────────────────────────────────────────────────────

// MongoDB and the frontend's hardcoded exercise list disagree on plurals,
// spaces in compound words, and word order. Two normalized keys per name —
// one strict (handles compounds like "Goodmornings" vs "Good Mornings"), one
// token-sorted (handles re-orderings like "DB Incline Curls" vs "Incline DB
// Curls") — let us match without maintaining a full alias table.
function normKey(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/s$/, '')
}
function sortedKey(name) {
  return (name || '').toLowerCase()
    .split(/[^a-z0-9]+/).filter(Boolean)
    .map(t => t.replace(/s$/, ''))
    .sort()
    .join('')
}

// Cases the normalizers can't bridge (e.g. mongo "Close Grip Pulldowns" has
// no "Lat", but the frontend label does).
const VIDEO_NAME_ALIASES = {
  'Close Grip Lat Pulldowns': 'Close Grip Pulldowns',
}

function buildVideoLookup(videos) {
  const byNorm = {}
  const bySorted = {}
  for (const v of videos) {
    if (!v?.mux_playback_id) continue
    byNorm[normKey(v.exercise_name)] = v.mux_playback_id
    bySorted[sortedKey(v.exercise_name)] = v.mux_playback_id
  }
  return (exerciseName) => {
    const aliased = VIDEO_NAME_ALIASES[exerciseName] || exerciseName
    return byNorm[normKey(aliased)] || bySorted[sortedKey(aliased)] || null
  }
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const MOVEMENT_PATTERNS = {
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
  'Hinge':                       ['Hip Thrusts','Bodyweight Hip Thrusts','RDLs','Trap Bar Deadlifts','Barbell Glute Bridges','Bodyweight Glute Bridges','Single Leg RDLs','Sumo Deadlift','Good Mornings'],
  'Squat Pattern':               ['Front Squat','SSB Squats','Squats','Back Squat','Box Squats','Bodyweight Squat','Pendulum Squat','Leg Press','Goblet Squat','Zercher Squat'],
  'Posterior Chain Accessory':   ['Back Extensions','Bodyweight Back Extensions','Nordics','Reverse Hypers','GHD Raises','Single Leg Hip Thrusts'],
  'Unilateral Lower':            ['Bulgarians','Bodyweight Bulgarians','Walking Lunges','Bodyweight Lunges','ATG Lunges','Bodyweight ATG Lunges','Reverse Lunges','Step Ups'],
  'Isolation Lower':             ['Leg Extensions','Single Leg Extensions','Seated Leg Curls','Lying Leg Curls','Abductor Machine','Adductor Machine'],
  'Calves & Shins':              ['Single Leg Calf Raises','Calf Raise Machine','Seated Calf Raises','Bodyweight Calf Raises','Weighted Calf Raises','Donkey Calf Raises','Tibia Raises','Tibia Curls','Banded Tibia Curls'],
  'Machine Lower':               ['Leg Press','Hack Squat','Hack Squat Machine','Pendulum Squat','Reverse Hack Squat'],
  'Core':                        ['Plank','Ab Wheel Rollouts','Hanging Leg Raises','Cable Crunches','Decline Crunches','Pallof Press','Dead Bugs','Suitcase Carries','Farmer Carries'],
  'Bodyweight Strength Upper':   ['Pushups','Incline Pushups','Diamond Pushups','Wide Pushups','Dips','Pullups','Chin Ups','Neutral Grip Pullups','Inverted Bodyweight Row','Burpees'],
  'Bodyweight Lower':            ['Bodyweight Squat','Bodyweight Lunges','Bodyweight ATG Lunges','Bodyweight Bulgarians','Bodyweight Hip Thrusts','Bodyweight Glute Bridges','Bodyweight Back Extensions','Nordics','GHD Raises','Bodyweight Calf Raises'],
  'Cardio':                      ['Treadmill','Curved Treadmill','Assault Bike','Bike','Recumbent Bike','Elliptical','Stairmaster','Rowing Machine','Ski Erg'],
}

const UPPER_PATTERNS = ['Horizontal Push','Vertical Push','Unilateral Push','Tricep Accessory','Shoulder Accessory','Chest Accessory','Push Machine','Vertical Pull','Horizontal Pull','Posterior Upper Accessory','Bicep Accessory','Bodyweight Strength Upper']
const LOWER_PATTERNS = ['Hinge','Squat Pattern','Posterior Chain Accessory','Unilateral Lower','Isolation Lower','Calves & Shins','Machine Lower','Bodyweight Lower']

function bodyOf(p) {
  if (UPPER_PATTERNS.includes(p)) return 'upper'
  if (LOWER_PATTERNS.includes(p)) return 'lower'
  if (p === 'Cardio') return 'cardio'
  return 'core'
}

const PATTERN_MUSCLES = {
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

// ─── Equipment Map ────────────────────────────────────────────────────────────

const EXERCISE_EQUIPMENT = {
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
  // Squat Pattern
  'Front Squat': 'Barbell', 'SSB Squats': 'Barbell', 'Squats': 'Barbell', 'Back Squat': 'Barbell', 'Box Squats': 'Barbell',
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
  'Squat': 'Barbell', 'Back Squat': 'Barbell', 'Deadlift': 'Barbell',
  // Bodyweight exercises
  'Pullups': 'Bodyweight', 'Chin Ups': 'Bodyweight', 'Neutral Grip Pullups': 'Bodyweight',
  'Dips': 'Bodyweight', 'Pushups': 'Bodyweight',
  'Nordics': 'Bodyweight', 'Bodyweight Back Extensions': 'Bodyweight', 'GHD Raises': 'Bodyweight',
  'Bodyweight Calf Raises': 'Bodyweight', 'Tibia Raises': 'Bodyweight', 'Banded Tibia Raises': 'Bodyweight', 'Banded Tibia Curls': 'Bodyweight',
  'Plank': 'Bodyweight', 'Ab Wheel Rollouts': 'Bodyweight', 'Hanging Leg Raises': 'Bodyweight', 'Decline Crunches': 'Bodyweight', 'Dead Bugs': 'Bodyweight',
  'Bodyweight Squat': 'Bodyweight', 'Bodyweight Lunges': 'Bodyweight', 'Bodyweight ATG Lunges': 'Bodyweight',
  'Bodyweight Bulgarians': 'Bodyweight', 'Bodyweight Hip Thrusts': 'Bodyweight', 'Bodyweight Glute Bridges': 'Bodyweight',
  'Incline Pushups': 'Bodyweight', 'Diamond Pushups': 'Bodyweight', 'Wide Pushups': 'Bodyweight',
  'Inverted Bodyweight Row': 'Bodyweight', 'Burpees': 'Bodyweight',
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

// ─── Muscle Diagram SVG ───────────────────────────────────────────────────────

function BodyDiagram({ muscles = {} }) {
  const c  = (k) => muscles[k] || 'transparent'
  const b  = 'rgba(0,0,0,0.35)'
  const ol = 'rgba(255,255,255,0.08)'
  // Derive a dynamic SR label listing which muscle groups are highlighted
  // for this exercise. Static labels would lie about the diagram contents.
  const highlightedMuscles = Object.entries(muscles)
    .filter(([, color]) => color && color !== 'transparent')
    .map(([key]) => key)
  const diagramLabel = highlightedMuscles.length > 0
    ? `Body diagram highlighting: ${highlightedMuscles.join(', ')}`
    : 'Body diagram'
  const svg = `<svg viewBox="0 0 80 160" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="40" cy="12" rx="9" ry="10" fill="${b}" stroke="${ol}" stroke-width=".5"/>
  <rect x="36" y="21" width="8" height="7" fill="${b}" stroke="${ol}" stroke-width=".5"/>
  <path d="M28 28 Q40 24 52 28 L54 36 Q40 32 26 36Z" fill="${c('traps')}" stroke="${ol}" stroke-width=".5"/>
  <path d="M26 36 Q33 33 39 35 L39 50 Q31 52 26 49Z" fill="${c('chest')}" stroke="${ol}" stroke-width=".5"/>
  <path d="M54 36 Q47 33 41 35 L41 50 Q49 52 54 49Z" fill="${c('chest')}" stroke="${ol}" stroke-width=".5"/>
  <ellipse cx="22" cy="38" rx="6" ry="8" fill="${c('shoulders')}" stroke="${ol}" stroke-width=".5"/>
  <ellipse cx="58" cy="38" rx="6" ry="8" fill="${c('shoulders')}" stroke="${ol}" stroke-width=".5"/>
  <path d="M26 49 L24 62 L30 68 L39 62 L39 50Z" fill="${c('lats')}" stroke="${ol}" stroke-width=".5"/>
  <path d="M54 49 L56 62 L50 68 L41 62 L41 50Z" fill="${c('lats')}" stroke="${ol}" stroke-width=".5"/>
  <path d="M33 50 L47 50 L47 68 L33 68Z" fill="${c('abs')}" stroke="${ol}" stroke-width=".5"/>
  <line x1="40" y1="50" x2="40" y2="68" stroke="${ol}" stroke-width=".5"/>
  <line x1="33" y1="56" x2="47" y2="56" stroke="${ol}" stroke-width=".5"/>
  <line x1="33" y1="62" x2="47" y2="62" stroke="${ol}" stroke-width=".5"/>
  <path d="M16 46 Q12 52 13 60 Q17 62 20 60 Q22 52 22 46Z" fill="${c('biceps')}" stroke="${ol}" stroke-width=".5"/>
  <path d="M64 46 Q68 52 67 60 Q63 62 60 60 Q58 52 58 46Z" fill="${c('biceps')}" stroke="${ol}" stroke-width=".5"/>
  <path d="M22 46 Q20 40 22 36 Q26 36 26 40Z" fill="${c('triceps')}" stroke="${ol}" stroke-width=".4"/>
  <path d="M58 46 Q60 40 58 36 Q54 36 54 40Z" fill="${c('triceps')}" stroke="${ol}" stroke-width=".4"/>
  <path d="M13 60 Q10 68 11 76 Q15 77 18 76 Q20 68 20 60Z" fill="${c('forearms')}" stroke="${ol}" stroke-width=".5"/>
  <path d="M67 60 Q70 68 69 76 Q65 77 62 76 Q60 68 60 60Z" fill="${c('forearms')}" stroke="${ol}" stroke-width=".5"/>
  <ellipse cx="12" cy="79" rx="4" ry="5" fill="${b}" stroke="${ol}" stroke-width=".5"/>
  <ellipse cx="68" cy="79" rx="4" ry="5" fill="${b}" stroke="${ol}" stroke-width=".5"/>
  <path d="M30 68 L50 68 L52 80 L28 80Z" fill="${b}" stroke="${ol}" stroke-width=".5"/>
  <path d="M28 80 Q34 78 39 80 L39 90 Q32 93 28 90Z" fill="${c('glutes')}" stroke="${ol}" stroke-width=".5"/>
  <path d="M52 80 Q46 78 41 80 L41 90 Q48 93 52 90Z" fill="${c('glutes')}" stroke="${ol}" stroke-width=".5"/>
  <path d="M28 90 Q24 100 25 114 Q30 116 34 114 Q36 100 39 90Z" fill="${c('quads')}" stroke="${ol}" stroke-width=".5"/>
  <path d="M52 90 Q56 100 55 114 Q50 116 46 114 Q44 100 41 90Z" fill="${c('quads')}" stroke="${ol}" stroke-width=".5"/>
  <path d="M25 114 Q25 124 27 130 Q31 131 34 130 Q34 124 34 114Z" fill="${c('hamstrings')}" stroke="${ol}" stroke-width=".5"/>
  <path d="M55 114 Q55 124 53 130 Q49 131 46 130 Q46 124 46 114Z" fill="${c('hamstrings')}" stroke="${ol}" stroke-width=".5"/>
  <path d="M27 130 Q26 140 28 148 Q31 149 33 148 Q34 140 34 130Z" fill="${c('calves')}" stroke="${ol}" stroke-width=".5"/>
  <path d="M53 130 Q54 140 52 148 Q49 149 47 148 Q46 140 46 130Z" fill="${c('calves')}" stroke="${ol}" stroke-width=".5"/>
  <ellipse cx="30" cy="151" rx="5" ry="3" fill="${b}" stroke="${ol}" stroke-width=".5"/>
  <ellipse cx="50" cy="151" rx="5" ry="3" fill="${b}" stroke="${ol}" stroke-width=".5"/>
  </svg>`
  return (
    <div
      role="img"
      aria-label={diagramLabel}
      dangerouslySetInnerHTML={{ __html: svg }}
      style={{ width: '100%', height: '100%' }}
    />
  )
}

// ─── Exercise Card ────────────────────────────────────────────────────────────

function ExerciseCard({ exercise, onSelect }) {
  const bodyLabel = exercise.body === 'upper' ? 'Upper' : exercise.body === 'lower' ? 'Lower' : exercise.body === 'cardio' ? 'Cardio' : 'Core'
  const onActivate = () => onSelect(exercise)
  const onKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      onActivate()
    }
  }
  const equipmentLabel = exercise.equipment ? `, ${exercise.equipment}` : ''
  const cardLabel = `${exercise.name} — ${bodyLabel}, ${exercise.pattern}${equipmentLabel}, primary muscle: ${exercise.primary}`
  return (
    <div
      className="el-card"
      onClick={onActivate}
      onKeyDown={onKeyDown}
      role="button"
      tabIndex={0}
      aria-label={cardLabel}
    >
      <div className="el-card-body">
        <div className="el-muscle-icon">
          <BodyDiagram muscles={exercise.muscles} />
        </div>
        <div className="el-card-info">
          <div className="el-card-name" aria-hidden="true">{exercise.name}</div>
          <div className="el-card-tags" aria-hidden="true">
            <span className={`el-tag ${exercise.body}`}>{bodyLabel}</span>
            <span className="el-tag pattern">{exercise.pattern}</span>
            {exercise.equipment && (
              <span className={`el-tag equipment equipment--${exercise.equipment.toLowerCase().replace(' ', '-')}`}>{exercise.equipment}</span>
            )}
          </div>
        </div>
      </div>
      <div className="el-card-footer" aria-hidden="true">
        <span className="el-card-muscle">{exercise.primary}</span>
        <span className="el-card-arrow">→</span>
      </div>
    </div>
  )
}

// ─── Detail View ──────────────────────────────────────────────────────────────

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS_SHORT_EL = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function DetailView({ exercise, onBack, playbackId }) {
  const { personalBests } = useWorkout()
  const [detailTab, setDetailTab] = useState('cues')
  const [exerciseHistory, setExerciseHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const bodyLabel = exercise.body === 'upper' ? 'Upper Body' : exercise.body === 'lower' ? 'Lower Body' : exercise.body === 'cardio' ? 'Cardio' : 'Core'

  // Fetch all-time exercise history across every program
  useEffect(() => {
    const userId = localStorage.getItem('userId')
    if (!userId) return
    setHistoryLoading(true)
    fetch(`${API_URL}/api/users/workout/${userId}/exercise-history?exercise=${encodeURIComponent(exercise.name)}`)
      .then(r => r.ok ? r.json() : { history: [] })
      .then(data => {
        setExerciseHistory(
          (data.history ?? []).map(entry => {
            const repsRaw = entry.reps
            const repsArr = Array.isArray(repsRaw)
              ? repsRaw
              : typeof repsRaw === 'string' && repsRaw.includes(',')
                ? repsRaw.split(',').map(r => r.trim())
                : null
            return {
              ...entry,
              date: new Date(entry.date),
              getReps: (j) => repsArr ? (repsArr[j] ?? repsArr[repsArr.length - 1]) : repsRaw,
            }
          })
        )
      })
      .catch(() => setExerciseHistory([]))
      .finally(() => setHistoryLoading(false))
  }, [exercise.name])

  const pr = personalBests?.[exercise.name] ?? null

  return (
    <div className="el-page">
      <button className="el-detail-back" onClick={onBack} aria-label="Back to exercise library">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Exercise Library
      </button>

      <div className="el-detail-hero">
        <div className="el-video-wrap">
          {playbackId ? (
            <MuxPlayer
              streamType="on-demand"
              playbackId={playbackId}
              metadata={{ video_title: `How to perform — ${exercise.name}` }}
              accentColor="#cc0404"
              className="el-mux-player"
            />
          ) : (
            <>
              <button className="el-play-btn" aria-label={`Play video for ${exercise.name}`} disabled>
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><polygon points="5,3 19,12 5,21"/></svg>
              </button>
              <div className="el-video-label" role="status">Video coming soon — {exercise.name}</div>
            </>
          )}
        </div>
        <div className="el-detail-meta" role="group" aria-label="Exercise classification">
          <span className="el-badge primary">{exercise.primary}</span>
          <span className={`el-badge ${exercise.body}`}>{bodyLabel}</span>
          <span className="el-badge">{exercise.pattern}</span>
          {exercise.equipment && (
            <span className={`el-badge equipment equipment--${exercise.equipment.toLowerCase().replace(' ', '-')}`}>{exercise.equipment}</span>
          )}
        </div>
      </div>

      <div className="el-detail-body">
        <div className="el-steps-container">
          <div className="el-steps-header">
            <div className="el-steps-title" id="el-steps-title">{exercise.name}</div>
            <div className="el-steps-subtitle">Step-by-step execution</div>
          </div>

          {/* Tabs */}
          <div className="el-detail-tabs" role="tablist" aria-label="Exercise detail">
            <button
              id="el-tab-cues"
              role="tab"
              aria-selected={detailTab === 'cues'}
              aria-controls="el-panel-cues"
              className={`el-detail-tab${detailTab === 'cues' ? ' active' : ''}`}
              onClick={() => setDetailTab('cues')}
            >
              Coaching Cues
            </button>
            <button
              id="el-tab-pr"
              role="tab"
              aria-selected={detailTab === 'pr'}
              aria-controls="el-panel-pr"
              className={`el-detail-tab${detailTab === 'pr' ? ' active' : ''}`}
              onClick={() => setDetailTab('pr')}
            >
              Personal Record
            </button>
            <button
              id="el-tab-history"
              role="tab"
              aria-selected={detailTab === 'history'}
              aria-controls="el-panel-history"
              className={`el-detail-tab${detailTab === 'history' ? ' active' : ''}`}
              onClick={() => setDetailTab('history')}
            >
              Exercise History
            </button>
          </div>

          {/* Coaching Cues */}
          {detailTab === 'cues' && (
            <div className="el-step-list" id="el-panel-cues" role="tabpanel" aria-labelledby="el-tab-cues">
              {exercise.steps.map((step, i) => (
                <div className="el-step" key={i}>
                  <div className="el-step-num" aria-hidden="true">{i + 1}</div>
                  <div>
                    <div className="el-step-label">{step.t}</div>
                    <div
                      className="el-step-text"
                      dangerouslySetInnerHTML={{ __html: step.d }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Personal Record */}
          {detailTab === 'pr' && (
            <div className="el-pr-panel" id="el-panel-pr" role="tabpanel" aria-labelledby="el-tab-pr">
              {pr != null ? (
                <div className="el-pr-card">
                  <div className="el-pr-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" focusable="false">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <div className="el-pr-weight" aria-hidden="true">{pr}<span>lbs</span></div>
                  <div className="el-pr-label" aria-hidden="true">Personal Record</div>
                  <div className="el-pr-sub" aria-hidden="true">{exercise.name}</div>
                  <span className="sr-only">Personal record for {exercise.name}: {pr} pounds</span>
                </div>
              ) : (
                <div className="el-panel-empty" role="status">
                  <div className="el-panel-empty-icon" aria-hidden="true">🏆</div>
                  <div className="el-panel-empty-text">No personal record yet</div>
                  <div className="el-panel-empty-sub">Log this exercise to set your first PR</div>
                </div>
              )}
            </div>
          )}

          {/* Exercise History */}
          {detailTab === 'history' && (
            <div className="el-history-panel" id="el-panel-history" role="tabpanel" aria-labelledby="el-tab-history">
              {historyLoading ? (
                <div className="el-panel-empty" role="status" aria-live="polite">
                  <div className="el-panel-empty-text">Loading history…</div>
                </div>
              ) : exerciseHistory.length === 0 ? (
                <div className="el-panel-empty" role="status">
                  <div className="el-panel-empty-icon" aria-hidden="true">📋</div>
                  <div className="el-panel-empty-text">No history yet</div>
                  <div className="el-panel-empty-sub">Complete a workout containing {exercise.name} to see it here</div>
                </div>
              ) : (
                exerciseHistory.map((entry, idx) => (
                  <div className="el-hist-item" key={idx}>
                    <div className="el-hist-date-col">
                      <div className="el-hist-day-num">{entry.date.getDate()}</div>
                      <div className="el-hist-month">{MONTHS_SHORT[entry.date.getMonth()]}</div>
                      <div className="el-hist-weekday">{DAYS_SHORT_EL[entry.date.getDay()]}</div>
                    </div>
                    <div className="el-hist-divider" />
                    <div className="el-hist-content">
                      <div className="el-hist-day-title">
                        {entry.weekNumber != null && (
                          <span className="el-hist-week-tag">Week {entry.weekNumber}</span>
                        )}
                        {entry.dayTitle}
                      </div>
                      <div className="el-hist-sets">
                        {Array.from({ length: entry.setCount }, (_, j) => {
                          if (!entry.completedSets?.[j]) return null
                          const w = entry.actualWeights?.[j]
                          const r = entry.actualReps?.[j] ?? entry.getReps(j)
                          return (
                            <div className="el-hist-set-row" key={j}>
                              <div className="el-hist-set-num">{j + 1}</div>
                              <div className="el-hist-set-val"><span>{r ?? '—'}</span> reps</div>
                              <div className="el-hist-set-val"><span>{w ?? '—'}</span> lbs</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div>
          <div className="el-sidebar">
            <div className="el-sidebar-title">Muscles Worked</div>
            <div className="el-diagram-wrap">
              <BodyDiagram muscles={exercise.muscles} />
            </div>
            <div className="el-legend">
              <div className="el-legend-item">
                <span className="el-legend-dot primary" />Primary
              </div>
              <div className="el-legend-item">
                <span className="el-legend-dot secondary" />Secondary
              </div>
              <div className="el-legend-item">
                <span className="el-legend-dot synergist" />Stabilizer
              </div>
            </div>
            <div className="el-tips">
              <h4>Exercise Tips</h4>
              <ul>
                {exercise.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Custom Detail View ───────────────────────────────────────────────────────

function CustomDetailView({ name, onBack }) {
  const { personalBests } = useWorkout()
  const [detailTab, setDetailTab] = useState('pr')
  const [exerciseHistory, setExerciseHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    const userId = localStorage.getItem('userId')
    if (!userId) return
    setHistoryLoading(true)
    fetch(`${API_URL}/api/users/workout/${userId}/exercise-history?exercise=${encodeURIComponent(name)}`)
      .then(r => r.ok ? r.json() : { history: [] })
      .then(data => {
        setExerciseHistory(
          (data.history ?? []).map(entry => {
            const repsRaw = entry.reps
            const repsArr = Array.isArray(repsRaw)
              ? repsRaw
              : typeof repsRaw === 'string' && repsRaw.includes(',')
                ? repsRaw.split(',').map(r => r.trim())
                : null
            return {
              ...entry,
              date: new Date(entry.date),
              getReps: (j) => repsArr ? (repsArr[j] ?? repsArr[repsArr.length - 1]) : repsRaw,
            }
          })
        )
      })
      .catch(() => setExerciseHistory([]))
      .finally(() => setHistoryLoading(false))
  }, [name])

  const pr = personalBests?.[name] ?? null

  return (
    <div className="el-page">
      <button className="el-detail-back" onClick={onBack} aria-label="Back to custom exercises">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Custom Exercises
      </button>

      <div className="el-detail-body" style={{ marginTop: '24px' }}>
        <div className="el-steps-container">
          <div className="el-steps-header">
            <div className="el-steps-title">{name}</div>
            <div className="el-steps-subtitle">Custom Exercise</div>
          </div>

          <div className="el-detail-tabs" role="tablist" aria-label="Custom exercise detail">
            <button
              id="el-cust-tab-pr"
              role="tab"
              aria-selected={detailTab === 'pr'}
              aria-controls="el-cust-panel-pr"
              className={`el-detail-tab${detailTab === 'pr' ? ' active' : ''}`}
              onClick={() => setDetailTab('pr')}
            >
              Personal Record
            </button>
            <button
              id="el-cust-tab-history"
              role="tab"
              aria-selected={detailTab === 'history'}
              aria-controls="el-cust-panel-history"
              className={`el-detail-tab${detailTab === 'history' ? ' active' : ''}`}
              onClick={() => setDetailTab('history')}
            >
              Exercise History
            </button>
          </div>

          {detailTab === 'pr' && (
            <div className="el-pr-panel" id="el-cust-panel-pr" role="tabpanel" aria-labelledby="el-cust-tab-pr">
              {pr != null ? (
                <div className="el-pr-card">
                  <div className="el-pr-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" focusable="false">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <div className="el-pr-weight" aria-hidden="true">{pr}<span>lbs</span></div>
                  <div className="el-pr-label" aria-hidden="true">Personal Record</div>
                  <div className="el-pr-sub" aria-hidden="true">{name}</div>
                  <span className="sr-only">Personal record for {name}: {pr} pounds</span>
                </div>
              ) : (
                <div className="el-panel-empty" role="status">
                  <div className="el-panel-empty-icon" aria-hidden="true">🏆</div>
                  <div className="el-panel-empty-text">No personal record yet</div>
                  <div className="el-panel-empty-sub">Log this exercise to set your first PR</div>
                </div>
              )}
            </div>
          )}

          {detailTab === 'history' && (
            <div className="el-history-panel" id="el-cust-panel-history" role="tabpanel" aria-labelledby="el-cust-tab-history">
              {historyLoading ? (
                <div className="el-panel-empty" role="status" aria-live="polite">
                  <div className="el-panel-empty-text">Loading history…</div>
                </div>
              ) : exerciseHistory.length === 0 ? (
                <div className="el-panel-empty" role="status">
                  <div className="el-panel-empty-icon" aria-hidden="true">📋</div>
                  <div className="el-panel-empty-text">No history yet</div>
                  <div className="el-panel-empty-sub">Complete a workout containing {name} to see it here</div>
                </div>
              ) : (
                exerciseHistory.map((entry, idx) => (
                  <div className="el-hist-item" key={idx}>
                    <div className="el-hist-date-col">
                      <div className="el-hist-day-num">{entry.date.getDate()}</div>
                      <div className="el-hist-month">{MONTHS_SHORT[entry.date.getMonth()]}</div>
                      <div className="el-hist-weekday">{DAYS_SHORT_EL[entry.date.getDay()]}</div>
                    </div>
                    <div className="el-hist-divider" />
                    <div className="el-hist-content">
                      <div className="el-hist-day-title">
                        {entry.weekNumber != null && (
                          <span className="el-hist-week-tag">Week {entry.weekNumber}</span>
                        )}
                        {entry.dayTitle}
                      </div>
                      <div className="el-hist-sets">
                        {Array.from({ length: entry.setCount }, (_, j) => {
                          if (!entry.completedSets?.[j]) return null
                          const w = entry.actualWeights?.[j]
                          const r = entry.actualReps?.[j] ?? entry.getReps(j)
                          return (
                            <div className="el-hist-set-row" key={j}>
                              <div className="el-hist-set-num">{j + 1}</div>
                              <div className="el-hist-set-val"><span>{r ?? '—'}</span> reps</div>
                              <div className="el-hist-set-val"><span>{w ?? '—'}</span> lbs</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Custom Exercises Section ─────────────────────────────────────────────────

function CustomExercisesSection({ onSelect }) {
  const [customExercises, setCustomExercises] = useState(() => {
    try { return JSON.parse(localStorage.getItem('customExercises') || '[]') } catch { return [] }
  })
  const [inputVal, setInputVal] = useState('')
  const [error, setError] = useState('')

  const userId = localStorage.getItem('userId')

  useEffect(() => {
    if (!userId) return
    fetch(`${API_URL}/api/users/${userId}/custom-exercises`)
      .then(r => r.ok ? r.json() : { custom_exercises: [] })
      .then(data => {
        const list = data.custom_exercises ?? []
        setCustomExercises(list)
        localStorage.setItem('customExercises', JSON.stringify(list))
      })
      .catch(() => {})
  }, [userId])

  const syncLocalStorage = (list) => localStorage.setItem('customExercises', JSON.stringify(list))

  const addExercise = async () => {
    const name = inputVal.trim()
    if (!name) return
    if (customExercises.some(n => n.toLowerCase() === name.toLowerCase())) {
      setError('That exercise already exists in your custom list')
      return
    }
    setInputVal('')
    setError('')
    if (userId) {
      try {
        const res = await fetch(`${API_URL}/api/users/${userId}/custom-exercises`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        })
        const data = await res.json()
        const list = data.custom_exercises ?? [...customExercises, name]
        setCustomExercises(list)
        syncLocalStorage(list)
      } catch {
        const list = [...customExercises, name]
        setCustomExercises(list)
        syncLocalStorage(list)
      }
    } else {
      const list = [...customExercises, name]
      setCustomExercises(list)
      syncLocalStorage(list)
    }
  }

  const removeExercise = async (name) => {
    const list = customExercises.filter(n => n !== name)
    setCustomExercises(list)
    syncLocalStorage(list)
    if (userId) {
      fetch(`${API_URL}/api/users/${userId}/custom-exercises/${encodeURIComponent(name)}`, { method: 'DELETE' })
        .catch(() => {})
    }
  }

  return (
    <div className="el-section" aria-labelledby="el-custom-section-label">
      <div className="el-section-label" id="el-custom-section-label">Custom Exercises</div>
      <p style={{ color: 'var(--text-muted, #888)', fontSize: '13px', margin: '0 0 14px', lineHeight: 1.5 }}>
        Add exercises not in the standard library. They will be available as valid options in the custom workout maker.
      </p>
      <div style={{ display: 'flex', gap: '8px', marginBottom: error ? '6px' : '16px' }}>
        <label htmlFor="el-custom-add-input" className="sr-only">New custom exercise name</label>
        <input
          id="el-custom-add-input"
          type="text"
          placeholder="Exercise name..."
          aria-label="New custom exercise name"
          aria-describedby={error ? 'el-custom-add-error' : undefined}
          aria-invalid={!!error || undefined}
          value={inputVal}
          onChange={e => { setInputVal(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && addExercise()}
          style={{ flex: 1, background: 'var(--input-bg, #1a1a1a)', border: '1px solid var(--border, #333)', borderRadius: '8px', padding: '9px 12px', color: 'var(--text)', fontSize: '14px', outline: 'none' }}
        />
        <button
          onClick={addExercise}
          aria-label="Add custom exercise"
          style={{ background: 'var(--accent, #e63946)', border: 'none', borderRadius: '8px', padding: '9px 18px', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Add
        </button>
      </div>
      {error && (
        <div
          id="el-custom-add-error"
          role="alert"
          style={{ color: '#ff5555', fontSize: '12px', marginBottom: '12px' }}
        >
          {error}
        </div>
      )}
      {customExercises.length === 0 ? (
        <div role="status" style={{ color: 'var(--text-muted, #888)', fontSize: '13px', padding: '12px 0' }}>No custom exercises yet.</div>
      ) : (
        <div className="el-grid">
          {customExercises.map(name => {
            const onActivate = () => onSelect(name)
            const onCardKeyDown = (e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault()
                onActivate()
              }
            }
            return (
              <div
                key={name}
                className="el-card"
                onClick={onActivate}
                onKeyDown={onCardKeyDown}
                role="button"
                tabIndex={0}
                aria-label={`${name}, custom exercise`}
              >
                <div className="el-card-body">
                  <div className="el-card-info" style={{ width: '100%' }}>
                    <div className="el-card-name" aria-hidden="true">{name}</div>
                    <div className="el-card-tags" aria-hidden="true">
                      <span className="el-tag" style={{ background: 'rgba(250,204,21,0.15)', color: '#facc15' }}>Custom</span>
                    </div>
                  </div>
                </div>
                <div className="el-card-footer">
                  <span className="el-card-muscle" aria-hidden="true">Custom Exercise</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Real <button> nested inside role="button" parent — semantically
                        invalid per ARIA, but functionally works (separate tab stop,
                        Space/Enter stopPropagation prevents card activation).
                        Flagged as follow-up: split card into a name-button + remove-button
                        siblings rather than nested. */}
                    <button
                      className="el-card-arrow"
                      onClick={e => { e.stopPropagation(); removeExercise(name) }}
                      onKeyDown={e => e.stopPropagation()}
                      aria-label={`Remove ${name} from custom exercises`}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #888)', fontSize: '16px', lineHeight: 1, padding: '0 2px' }}
                    ><span aria-hidden="true">×</span></button>
                    <span className="el-card-arrow" aria-hidden="true">→</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Library View ─────────────────────────────────────────────────────────────

function LibraryView({ exercises, activeTab, search, onTabChange, onSearchChange, onSelect, onCustomSelect }) {
  const grouped = useMemo(() => {
    const upper  = {}
    const lower  = {}
    const core   = {}
    const cardio = {}
    for (const ex of exercises) {
      const bucket = ex.body === 'upper' ? upper : ex.body === 'lower' ? lower : ex.body === 'cardio' ? cardio : core
      if (!bucket[ex.pattern]) bucket[ex.pattern] = []
      bucket[ex.pattern].push(ex)
    }
    return { upper, lower, core, cardio }
  }, [exercises])

  const showUpper  = activeTab === 'all' || activeTab === 'upper'
  const showLower  = activeTab === 'all' || activeTab === 'lower'
  const showCore   = activeTab === 'all' || activeTab === 'core'
  const showCardio = activeTab === 'all' || activeTab === 'cardio'

  const tabs = [
    { key: 'all',    label: 'All' },
    { key: 'upper',  label: 'Upper Body' },
    { key: 'lower',  label: 'Lower Body' },
    { key: 'core',   label: 'Core' },
    { key: 'cardio', label: 'Cardio' },
    { key: 'custom', label: 'Custom' },
  ]

  function PatternSection({ patterns, visible }) {
    if (!visible) return null
    const hasExercises = Object.values(patterns).some(arr => arr.length > 0)
    if (!hasExercises) return null
    return (
      <>
        {Object.entries(patterns).map(([pattern, exs]) =>
          exs.length === 0 ? null : (
            <div className="el-pattern-group" key={pattern}>
              <div className="el-pattern-label">{pattern}</div>
              <div className="el-grid">
                {exs.map(ex => (
                  <ExerciseCard key={ex.id} exercise={ex} onSelect={onSelect} />
                ))}
              </div>
            </div>
          )
        )}
      </>
    )
  }

  return (
    <div className="el-page">
      <div className="el-header">
        <div>
          <div className="el-title">Exercise <span>Library</span></div>
          <div className="el-subtitle">Video guides for every movement in your program</div>
        </div>
        {activeTab !== 'custom' && (
          <div className="el-count" aria-live="polite" aria-atomic="true">
            <span aria-hidden="true">{exercises.length} exercise{exercises.length !== 1 ? 's' : ''}</span>
            <span className="sr-only">{exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'} shown</span>
          </div>
        )}
      </div>

      {activeTab !== 'custom' && (
        <div className="el-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <label htmlFor="el-search-input" className="sr-only">Search exercises or patterns</label>
          <input
            id="el-search-input"
            type="search"
            placeholder="Search exercises or patterns…"
            aria-label="Search exercises or patterns"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>
      )}

      <div className="el-tabs" role="tablist" aria-label="Filter exercises by body region">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            id={`el-filter-tab-${key}`}
            role="tab"
            aria-selected={activeTab === key}
            aria-controls={`el-filter-panel-${key}`}
            className={`el-tab${activeTab === key ? ' active' : ''}`}
            data-tab={key}
            onClick={() => onTabChange(key)}
          >
            <span className="el-tab-dot" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'custom' ? (
        <div id={`el-filter-panel-custom`} role="tabpanel" aria-labelledby="el-filter-tab-custom">
          <CustomExercisesSection onSelect={onCustomSelect} />
        </div>
      ) : (
        <div id={`el-filter-panel-${activeTab}`} role="tabpanel" aria-labelledby={`el-filter-tab-${activeTab}`}>
          {exercises.length === 0 ? (
            <div className="el-empty" role="status" aria-live="polite">No exercises match "{search}"</div>
          ) : (
            <>
              {showUpper && Object.keys(grouped.upper).length > 0 && (
                <div className="el-section">
                  <div className="el-section-label">Upper Body</div>
                  <PatternSection patterns={grouped.upper} visible />
                </div>
              )}
              {showLower && Object.keys(grouped.lower).length > 0 && (
                <div className="el-section">
                  <div className="el-section-label">Lower Body</div>
                  <PatternSection patterns={grouped.lower} visible />
                </div>
              )}
              {showCore && Object.keys(grouped.core).length > 0 && (
                <div className="el-section">
                  <div className="el-section-label">Core</div>
                  <PatternSection patterns={grouped.core} visible />
                </div>
              )}
              {showCardio && Object.keys(grouped.cardio).length > 0 && (
                <div className="el-section">
                  <div className="el-section-label">Cardio</div>
                  <PatternSection patterns={grouped.cardio} visible />
                </div>
              )}
            </>
          )}
          <CustomExercisesSection onSelect={onCustomSelect} />
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const ALL_EXERCISES = buildExerciseList()

function ExerciseLibrary() {
  const [activeTab, setActiveTab]       = useState('all')
  const [search, setSearch]             = useState('')
  const [selected, setSelected]         = useState(null)
  const [customSelected, setCustomSelected] = useState(null)
  const [videos, setVideos]             = useState([])

  useEffect(() => {
    fetch(`${API_URL}/api/users/library-videos`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setVideos(Array.isArray(data) ? data : []))
      .catch(() => setVideos([]))
  }, [])

  const lookupPlaybackId = useMemo(() => buildVideoLookup(videos), [videos])

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim()
    if (!term) {
      if (activeTab === 'all') return ALL_EXERCISES
      return ALL_EXERCISES.filter(ex => ex.body === activeTab)
    }
    return ALL_EXERCISES.filter(ex => {
      const matchesBody = activeTab === 'all' || ex.body === activeTab
      const matchesSearch = ex.name.toLowerCase().includes(term) || ex.pattern.toLowerCase().includes(term)
      return matchesBody && matchesSearch
    })
  }, [activeTab, search])

  if (selected) {
    return <DetailView exercise={selected} onBack={() => setSelected(null)} playbackId={lookupPlaybackId(selected.name)} />
  }

  if (customSelected) {
    return <CustomDetailView name={customSelected} onBack={() => setCustomSelected(null)} />
  }

  return (
    <LibraryView
      exercises={filtered}
      totalCount={ALL_EXERCISES.length}
      activeTab={activeTab}
      search={search}
      onTabChange={(tab) => { setActiveTab(tab); setSearch('') }}
      onSearchChange={setSearch}
      onSelect={setSelected}
      onCustomSelect={setCustomSelected}
    />
  )
}

export default ExerciseLibrary
