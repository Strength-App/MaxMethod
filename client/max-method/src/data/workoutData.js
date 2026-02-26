// ── Exercise Library ──────────────────────────────────────────────────────────
export const EXERCISES = {
  "Horizontal Push": ["Bench Press","Incline Bench Press","Decline Bench Press","Floor Press"],
  "Vertical Push": ["Military Press","Seated Military Press","Push Press"],
  "Unilateral Push": ["DB Incline Bench","DB Flat Bench","DB Shoulder Press","Arnold Press","DB Floor Press"],
  "Tricep Accessory": ["Dips","Skullcrushers","Tricep Pushdowns","Tricep Extensions","Dip Machine","Overhead Tricep Extensions","One Arm Extensions","Close Grip Bench Press"],
  "Shoulder Accessory": ["Front Raises","Lateral Raises","Cable Lateral Raises","Upright Rows","Face Pulls","Band Pull Aparts"],
  "Chest Accessory": ["Chest Fly Machine","DB Chest Flys","Pushups","Weighted Pushups","Floor Chest Flys","Incline Chest Flys","Cable Chest Flys","Low to High Cable Flys"],
  "Vertical Pull": ["Neutral Grip Pullups","Pullups","Chin Ups","Lat Pulldowns","Close Grip Lat Pulldowns","Wide Grip Lat Pulldowns","Single Arm Pulldowns"],
  "Horizontal Pull": ["Barbell Row","Underhand Barbell Row","Cable Row","T Bar Rows","Single Arm Cable Rows","Single Arm Dumbbell Rows","Chest Supported Row","Meadows Row","Seal Row","Pendlay Row"],
  "Posterior Upper Accessory": ["Scarecrows","Rear Delt Flys","Machine Rear Delt Flys","Pullovers","Cable Pullovers","Shrugs","DB Shrugs","Trap Bar Shrugs","YTWLs"],
  "Bicep Accessory": ["DB Curls","Barbell Curls","Ez Bar Curls","Hammer Curls","Preacher Curls","Cable Curls","Rope Curls","Incline DB Curls","Concentration Curls","Cross Body Hammer Curls"],
  "Hinge": ["Hip Thrusts","RDLs","Trap Bar Deadlifts","Barbell Glute Bridges","Single Leg RDLs","Sumo Deadlift","Good Mornings"],
  "Squat Pattern": ["Front Squat","SSB Squats","Hack Squat Machine","Pendulum Squat","Leg Press","Goblet Squat","Zercher Squat"],
  "Posterior Chain Accessory": ["Back Extensions","Nordics","Reverse Hypers","GHD Raises","Single Leg Hip Thrusts"],
  "Unilateral Lower": ["Bulgarians","Walking Lunges","ATG Lunges","Reverse Lunges","Step Ups"],
  "Isolation Lower": ["Leg Extensions","Single Leg Extensions","Seated Leg Curls","Lying Leg Curls","Abductor Machine","Adductor Machine"],
  "Calves & Shins": ["Single Leg Calf Raises","Calf Raise Machine","Seated Calf Raises","Bodyweight Calf Raises","Weighted Calf Raises","Donkey Calf Raises","Tibia Raises","Tibia Curls","Banded Tibia Curls"],
  "Core": ["Plank","Ab Wheel Rollouts","Hanging Leg Raises","Cable Crunches","Decline Crunches","Pallof Press","Dead Bugs","Suitcase Carries","Farmer Carries"],
};

// ── Day Templates (0-indexed: day 0 = Day 1, etc.) ───────────────────────────
// fixed: string means this exercise is locked and not user-selectable
// pattern: string means pull from that category; user can swap
export const DAY_TEMPLATES = [
  {
    title: "Day 1 — Push",
    slots: [
      { label: "Main Lift",          sets: 5, reps: "5",     weightNote: "80%+", pattern: null,                    fixed: "Bench Press" },
      { label: "Unilateral Push",    sets: 3, reps: "5-8",   weightNote: "",     pattern: "Unilateral Push" },
      { label: "Chest Accessory",    sets: 3, reps: "12-15", weightNote: "",     pattern: "Chest Accessory" },
      { label: "Shoulder Accessory", sets: 3, reps: "8-12",  weightNote: "",     pattern: "Shoulder Accessory" },
      { label: "Tricep Accessory",   sets: 3, reps: "8-12",  weightNote: "",     pattern: "Tricep Accessory" },
      { label: "Tricep Accessory",   sets: 3, reps: "15-20", weightNote: "",     pattern: "Tricep Accessory" },
    ],
  },
  {
    title: "Day 2 — Legs",
    slots: [
      { label: "Main Lift",                 sets: 5, reps: "5",     weightNote: "80%+", pattern: null,                        fixed: "Back Squat" },
      { label: "Hinge",                     sets: 3, reps: "5-8",   weightNote: "",     pattern: "Hinge" },
      { label: "Unilateral Lower",          sets: 3, reps: "8-10",  weightNote: "",     pattern: "Unilateral Lower" },
      { label: "Posterior Chain Accessory", sets: 3, reps: "12-15", weightNote: "",     pattern: "Posterior Chain Accessory" },
      { label: "Isolation Lower",           sets: 3, reps: "12-15", weightNote: "",     pattern: "Isolation Lower" },
      { label: "Calves & Shins",            sets: 3, reps: "15-20", weightNote: "",     pattern: "Calves & Shins" },
    ],
  },
  {
    title: "Day 3 — Pull",
    slots: [
      { label: "Main Lift",                 sets: 5, reps: "5",     weightNote: "80%+", pattern: null,                         fixed: "Deadlift" },
      { label: "Vertical Pull",             sets: 3, reps: "5-8",   weightNote: "",     pattern: "Vertical Pull" },
      { label: "Horizontal Pull",           sets: 3, reps: "8-12",  weightNote: "",     pattern: "Horizontal Pull" },
      { label: "Posterior Upper Accessory", sets: 3, reps: "12-15", weightNote: "",     pattern: "Posterior Upper Accessory" },
      { label: "Bicep Accessory",           sets: 3, reps: "10-12", weightNote: "",     pattern: "Bicep Accessory" },
      { label: "Bicep Accessory",           sets: 3, reps: "12-15", weightNote: "",     pattern: "Bicep Accessory" },
    ],
  },
];

export const WEEKS = 4;
export const DAYS_PER_WEEK = 3;

// ── Default exercise assignment (called once on app init) ─────────────────────
// Ensures duplicate patterns on same day get different exercises.
export function buildDefaultAssignments() {
  const assignments = {}; // { [dayIdx]: { [slotIdx]: exerciseName } }

  DAY_TEMPLATES.forEach((tmpl, di) => {
    assignments[di] = {};
    const usedPerPattern = {};

    tmpl.slots.forEach((slot, si) => {
      if (slot.fixed) {
        assignments[di][si] = slot.fixed;
        return;
      }
      const pool = EXERCISES[slot.pattern] || [];
      const used = usedPerPattern[slot.pattern] || [];
      const available = pool.filter(e => !used.includes(e));
      const pick = available.length > 0 ? available[0] : pool[0];
      assignments[di][si] = pick;
      usedPerPattern[slot.pattern] = [...used, pick];
    });
  });

  return assignments;
}

// ── Get valid options for a slot (excluding sibling selections) ───────────────
export function getSlotOptions(dayIdx, slotIdx, assignments) {
  const slot = DAY_TEMPLATES[dayIdx].slots[slotIdx];
  if (slot.fixed) return [slot.fixed];

  const pool = EXERCISES[slot.pattern] || [];
  const siblings = DAY_TEMPLATES[dayIdx].slots
    .map((s, i) => ({ s, i }))
    .filter(({ s, i }) => i !== slotIdx && s.pattern === slot.pattern)
    .map(({ i }) => assignments[dayIdx]?.[i])
    .filter(Boolean);

  return pool.filter(e => !siblings.includes(e));
}

// ── Build blank log structure ─────────────────────────────────────────────────
// log[weekIdx][dayIdx][slotIdx] = { actual: "", notes: "" }
export function buildBlankLog() {
  const log = {};
  for (let wi = 0; wi < WEEKS; wi++) {
    log[wi] = {};
    for (let di = 0; di < DAYS_PER_WEEK; di++) {
      log[wi][di] = {};
      DAY_TEMPLATES[di].slots.forEach((_, si) => {
        log[wi][di][si] = { actual: "", notes: "" };
      });
    }
  }
  return log;
}