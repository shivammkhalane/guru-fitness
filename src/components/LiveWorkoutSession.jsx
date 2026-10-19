import { useState } from 'react'
import { Check, CheckCircle2, Dumbbell, RotateCcw } from 'lucide-react'

const getSetCount = (exercise) => {
  const count = Number.parseInt(exercise?.sets, 10)
  return Number.isFinite(count) ? Math.max(1, Math.min(count, 20)) : 3
}

const getExerciseSignature = (exercises) => exercises
  .map((exercise, index) => `${index}:${exercise?.name || exercise?.exercise || 'Exercise'}:${getSetCount(exercise)}`)
  .join('|')

const getSetKey = (exerciseIndex, setIndex) => `${exerciseIndex}-${setIndex}`

export default function LiveWorkoutSession({ exercises = [], onFinish }) {
  const [progress, setProgress] = useState({ signature: '', sets: {} })
  const [finishedWorkout, setFinishedWorkout] = useState(null)
  const signature = getExerciseSignature(exercises)
  const currentSets = progress.signature === signature ? progress.sets : {}
  const validExercises = exercises.filter((exercise) => exercise && typeof exercise === 'object')
  const currentFinishedWorkout = finishedWorkout?.signature === signature ? finishedWorkout.summary : null
  const completedSetCount = validExercises.reduce((total, exercise, exerciseIndex) => (
    total + Array.from({ length: getSetCount(exercise) }, (_, setIndex) => (
      currentSets[getSetKey(exerciseIndex, setIndex)]?.completed ? 1 : 0
    )).reduce((sum, count) => sum + count, 0)
  ), 0)

  const updateSet = (exerciseIndex, setIndex, update) => {
    setProgress((previous) => {
      const sets = previous.signature === signature ? previous.sets : {}
      const key = getSetKey(exerciseIndex, setIndex)
      return {
        signature,
        sets: { ...sets, [key]: { ...sets[key], ...update } },
      }
    })
  }

  const finishWorkout = (event) => {
    event.preventDefault()
    if (currentFinishedWorkout) return

    let totalVolume = 0
    validExercises.forEach((exercise, exerciseIndex) => {
      for (let setIndex = 0; setIndex < getSetCount(exercise); setIndex += 1) {
        const set = currentSets[getSetKey(exerciseIndex, setIndex)]
        if (set?.completed) totalVolume += Number(set.weight) || 0
      }
    })

    const summary = { completedSets: completedSetCount, totalSets: validExercises.reduce((total, exercise) => total + getSetCount(exercise), 0), totalVolume }
    setFinishedWorkout({ signature, summary })
    onFinish?.(summary)
  }

  if (!validExercises.length) {
    return (
      <section className="live-workout-session" aria-label="Live workout session">
        <p className="live-workout-empty">No exercises are available for this workout.</p>
      </section>
    )
  }

  if (currentFinishedWorkout) {
    return (
      <section className="live-workout-session live-workout-success" aria-live="polite">
        <CheckCircle2 size={28} aria-hidden="true" />
        <div>
          <h3>Workout complete</h3>
          <p>{currentFinishedWorkout.completedSets} of {currentFinishedWorkout.totalSets} sets · {currentFinishedWorkout.totalVolume.toLocaleString()} kg total volume</p>
        </div>
        <button
          type="button"
          className="live-workout-reset"
          onClick={() => {
            setProgress({ signature, sets: {} })
            setFinishedWorkout(null)
          }}
        >
          <RotateCcw size={15} aria-hidden="true" /> Start again
        </button>
      </section>
    )
  }

  return (
    <form className="live-workout-session" onSubmit={finishWorkout}>
      <header className="live-workout-heading">
        <div className="live-workout-heading-icon"><Dumbbell size={18} aria-hidden="true" /></div>
        <div>
          <h3>Workout session</h3>
          <p>{completedSetCount} of {validExercises.reduce((total, exercise) => total + getSetCount(exercise), 0)} sets complete</p>
        </div>
      </header>

      <div className="live-workout-exercises">
        {validExercises.map((exercise, exerciseIndex) => (
          <fieldset className="live-workout-exercise" key={`${exerciseIndex}-${exercise.name || exercise.exercise || 'exercise'}`}>
            <legend>
              <strong>{exercise.name || exercise.exercise || `Exercise ${exerciseIndex + 1}`}</strong>
              <span>{exercise.muscle || 'Strength'}{exercise.reps ? ` · ${exercise.reps} reps` : ''}</span>
            </legend>
            {Array.from({ length: getSetCount(exercise) }, (_, setIndex) => {
              const set = currentSets[getSetKey(exerciseIndex, setIndex)] || {}
              return (
                <div className={`live-workout-set ${set.completed ? 'is-complete' : ''}`} key={setIndex}>
                  <label className="live-workout-complete">
                    <input
                      type="checkbox"
                      checked={Boolean(set.completed)}
                      onChange={(event) => updateSet(exerciseIndex, setIndex, { completed: event.target.checked })}
                    />
                    <span className="live-workout-checkmark"><Check size={16} aria-hidden="true" /></span>
                    <span className="live-workout-set-label">Set {setIndex + 1}</span>
                  </label>
                  <label className="live-workout-weight">
                    <span>Weight</span>
                    <input
                      type="number"
                      min="0"
                      max="999"
                      step="0.5"
                      inputMode="decimal"
                      value={set.weight ?? ''}
                      onChange={(event) => updateSet(exerciseIndex, setIndex, { weight: event.target.value })}
                      aria-label={`${exercise.name || 'Exercise'}, set ${setIndex + 1} weight in kilograms`}
                    />
                    <span>kg</span>
                  </label>
                </div>
              )
            })}
          </fieldset>
        ))}
      </div>

      <button type="submit" className="live-workout-finish-button">
        <CheckCircle2 size={17} aria-hidden="true" /> Finish workout
      </button>
    </form>
  )
}
