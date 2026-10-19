export const EXERCISE_DATASET_URL = 'https://exercise-dataset.com/exercises.json'
export const EXERCISE_DATASET_HOME = 'https://exercise-dataset.com/'
export const EXERCISE_DATA_ATTRIBUTION_URL = 'https://repdb.co'

let exercisesRequest

export function getExercises() {
  if (!exercisesRequest) {
    exercisesRequest = fetch(EXERCISE_DATASET_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Exercise database request failed (${response.status}).`)
        }
        return response.json()
      })
      .then((payload) => {
        if (!Array.isArray(payload?.exercises)) {
          throw new Error('The exercise database returned an unexpected response.')
        }
        return payload.exercises
      })
      .catch((error) => {
        exercisesRequest = undefined
        throw error
      })
  }

  return exercisesRequest
}

export function getExerciseName(exercise) {
  return exercise?.name_en || exercise?.name || 'Untitled exercise'
}

export function getExerciseImageUrl(path) {
  if (!path) return ''
  try {
    return new URL(path, EXERCISE_DATASET_HOME).toString()
  } catch {
    return ''
  }
}

export function getExerciseInstructions(exercise) {
  return exercise?.instructions_en || exercise?.instructions || []
}
