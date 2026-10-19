import { exerciseLibrary } from './exerciseLibrary.js'

const dietPlans = {
  muscle_gain: {
    style: 'Vegetarian',
    meals: [
      { meal: 'Breakfast', options: ['Oats with milk, nuts, and fruit', 'Paneer-stuffed whole-grain paratha with curd'] },
      { meal: 'Lunch', options: ['Dal, rice or roti, vegetables, and curd', 'Paneer or tofu with whole grains and vegetables'] },
      { meal: 'Snack', options: ['Greek yogurt or curd with fruit', 'Roasted chana and a banana'] },
      { meal: 'Dinner', options: ['Tofu or paneer, roti, and vegetables', 'Bean or lentil bowl with rice and salad'] },
    ],
  },
  fat_loss: {
    style: 'Vegetarian',
    meals: [
      { meal: 'Breakfast', options: ['Besan chilla with vegetables and curd', 'Oats with unsweetened yogurt and fruit'] },
      { meal: 'Lunch', options: ['Dal, extra vegetables, and rice or roti', 'Tofu or paneer with vegetables and whole grains'] },
      { meal: 'Snack', options: ['Fruit with roasted chana', 'Unsweetened curd with seeds'] },
      { meal: 'Dinner', options: ['Lentil soup, vegetables, and roti', 'Tofu or paneer salad bowl with beans'] },
    ],
  },
}

const workoutPlans = {
  muscle_gain: {
    label: 'Muscle gain',
    split: 'Push / Pull / Legs',
    daysPerWeek: 6,
    sessions: [
      { day: 'Day 1', focus: 'Push', exerciseGroups: [['chest', 0], ['shoulders', 0], ['chest', 1], ['shoulders', 1], ['arms', 2]] },
      { day: 'Day 2', focus: 'Pull', exerciseGroups: [['back', 0], ['back', 1], ['back', 3], ['arms', 0], ['core', 2]] },
      { day: 'Day 3', focus: 'Legs', exerciseGroups: [['legs', 0], ['legs', 1], ['legs', 2], ['legs', 3], ['core', 1]] },
      { day: 'Day 4', focus: 'Push', exerciseGroups: [['chest', 2], ['shoulders', 2], ['chest', 3], ['shoulders', 1], ['arms', 2]] },
      { day: 'Day 5', focus: 'Pull', exerciseGroups: [['back', 2], ['back', 0], ['back', 1], ['arms', 1], ['core', 0]] },
      { day: 'Day 6', focus: 'Legs', exerciseGroups: [['legs', 2], ['legs', 1], ['legs', 0], ['legs', 3], ['core', 3]] },
      { day: 'Day 7', focus: 'Recovery', exerciseGroups: [] },
    ],
    guidance: 'Choose loads that allow controlled repetitions with good form; increase gradually.',
  },
  fat_loss: {
    label: 'Fat loss',
    split: 'Strength + low-impact conditioning',
    daysPerWeek: 5,
    sessions: [
      { day: 'Day 1', focus: 'Full body strength', exerciseGroups: [['legs', 0], ['chest', 0], ['back', 1], ['legs', 3], ['core', 0]] },
      { day: 'Day 2', focus: 'Low-impact conditioning', exerciseGroups: [['cardio', 0], ['core', 2]] },
      { day: 'Day 3', focus: 'Full body strength', exerciseGroups: [['legs', 2], ['shoulders', 0], ['back', 0], ['legs', 3], ['core', 2]] },
      { day: 'Day 4', focus: 'Recovery', exerciseGroups: [] },
      { day: 'Day 5', focus: 'Full body strength', exerciseGroups: [['legs', 0], ['chest', 1], ['back', 2], ['legs', 1], ['core', 1]] },
      { day: 'Day 6', focus: 'Low-impact conditioning', exerciseGroups: [['cardio', 1], ['core', 0]] },
      { day: 'Day 7', focus: 'Recovery', exerciseGroups: [] },
    ],
    guidance: 'Keep strength training challenging but controlled; choose conditioning you can sustain.',
  },
}

const resolveGoal = (goal) => {
  const normalizedGoal = String(goal || '').trim().toLowerCase()
  const workout = workoutPlans[normalizedGoal]
  const diet = dietPlans[normalizedGoal]

  if (!workout || !diet) {
    throw new RangeError('Choose a supported goal: "muscle_gain" or "fat_loss".')
  }

  return { normalizedGoal, workout, diet }
}

export function generateAnimatedWorkoutPlan(goal) {
  const { normalizedGoal, workout, diet } = resolveGoal(goal)

  return {
    goal: normalizedGoal,
    goalLabel: workout.label,
    generatedBy: 'Guru Fitness exercise-library template',
    workout: {
      split: workout.split,
      daysPerWeek: workout.daysPerWeek,
      sessions: workout.sessions.map(({ day, focus, exerciseGroups }) => ({
        day,
        focus,
        exercises: exerciseGroups.map(([group, index]) => exerciseLibrary[group][index]),
      })),
      guidance: workout.guidance,
    },
    diet: {
      style: diet.style,
      meals: diet.meals.map((meal) => ({ ...meal, options: [...meal.options] })),
    },
    guidance: [
      'This is general fitness guidance, not individualized medical or dietetic advice.',
      'Adapt exercises to your experience, available equipment, and any advice from a qualified professional.',
    ],
  }
}

export function generateAiPlan(goal) {
  const animatedPlan = generateAnimatedWorkoutPlan(goal)
  return {
    goal: animatedPlan.goal,
    goalLabel: animatedPlan.goalLabel,
    generatedBy: animatedPlan.generatedBy,
    workout: {
      split: animatedPlan.workout.split,
      daysPerWeek: animatedPlan.workout.daysPerWeek,
      sessions: animatedPlan.workout.sessions.map((session) => ({
        day: session.day,
        focus: session.focus,
        exercises: session.exercises.map((exercise) => exercise.name),
      })),
      guidance: animatedPlan.workout.guidance,
    },
    diet: animatedPlan.diet,
    guidance: animatedPlan.guidance,
  }
}

export default generateAiPlan
