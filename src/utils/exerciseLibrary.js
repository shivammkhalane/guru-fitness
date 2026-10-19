const createExercise = (name, muscle, sets, reps) => ({
  name,
  sets,
  reps,
  muscle,
  animation_url: `https://placehold.co/640x480/121722/e8edf7.gif?text=${encodeURIComponent(`${name} · ${muscle}`)}`,
})

export const exerciseLibrary = {
  chest: [
    createExercise('Dumbbell Bench Press', 'Chest', 3, '8–12'),
    createExercise('Incline Dumbbell Press', 'Chest', 3, '8–12'),
    createExercise('Push-Up', 'Chest', 3, '10–15'),
    createExercise('Cable Chest Fly', 'Chest', 3, '12–15'),
  ],
  back: [
    createExercise('Lat Pulldown', 'Back', 3, '8–12'),
    createExercise('Seated Cable Row', 'Back', 3, '8–12'),
    createExercise('Dumbbell Row', 'Back', 3, '10–12 each side'),
    createExercise('Face Pull', 'Back', 3, '12–15'),
  ],
  legs: [
    createExercise('Goblet Squat', 'Legs', 3, '8–12'),
    createExercise('Romanian Deadlift', 'Legs', 3, '8–12'),
    createExercise('Reverse Lunge', 'Legs', 3, '10 each side'),
    createExercise('Glute Bridge', 'Legs', 3, '12–15'),
  ],
  shoulders: [
    createExercise('Dumbbell Shoulder Press', 'Shoulders', 3, '8–12'),
    createExercise('Dumbbell Lateral Raise', 'Shoulders', 3, '12–15'),
    createExercise('Arnold Press', 'Shoulders', 3, '8–12'),
  ],
  arms: [
    createExercise('Dumbbell Biceps Curl', 'Arms', 3, '10–12'),
    createExercise('Hammer Curl', 'Arms', 3, '10–12'),
    createExercise('Cable Triceps Press-Down', 'Arms', 3, '10–12'),
  ],
  core: [
    createExercise('Dead Bug', 'Core', 3, '10 each side'),
    createExercise('Plank', 'Core', 3, '20–45 sec'),
    createExercise('Bird Dog', 'Core', 3, '10 each side'),
    createExercise('Reverse Crunch', 'Core', 3, '10–15'),
  ],
  cardio: [
    createExercise('Brisk Walk', 'Cardio', 1, '20–30 min'),
    createExercise('Stationary Bike', 'Cardio', 1, '15–25 min'),
    createExercise('Low-Impact Intervals', 'Cardio', 1, '10–15 min'),
  ],
}

export default exerciseLibrary
