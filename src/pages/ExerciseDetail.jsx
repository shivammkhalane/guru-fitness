import { useEffect, useState } from 'react'
import { ArrowLeft, Dumbbell } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import {
  EXERCISE_DATA_ATTRIBUTION_URL,
  getExerciseImageUrl,
  getExerciseInstructions,
  getExerciseName,
  getExercises,
} from '../services/exerciseDataset'
import '../App.css'

const formatLabel = (value) => String(value || 'Not specified')
  .replaceAll('_', ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase())

export default function ExerciseDetail() {
  const { id } = useParams()
  const [result, setResult] = useState({ id: null, exercise: null, status: 'loading', error: '' })

  useEffect(() => {
    let isCurrent = true

    getExercises()
      .then((entries) => {
        if (!isCurrent) return
        const found = entries.find((entry) => entry.id === id)
        setResult({
          id,
          exercise: found || null,
          status: found ? 'ready' : 'not-found',
          error: '',
        })
      })
      .catch((loadError) => {
        if (!isCurrent) return
        setResult({
          id,
          exercise: null,
          status: 'error',
          error: loadError.message || 'Could not load exercise details.',
        })
      })

    return () => {
      isCurrent = false
    }
  }, [id])

  const status = result.id === id ? result.status : 'loading'
  const exercise = result.id === id ? result.exercise : null

  if (status === 'loading') {
    return <main className="exercise-page"><p className="exercise-feedback" role="status">Loading exercise details…</p></main>
  }

  if (status === 'error' || status === 'not-found') {
    return (
      <main className="exercise-page">
        <Link className="exercise-back-link" to="/library"><ArrowLeft size={17} aria-hidden="true" /> Exercise database</Link>
        <p className="exercise-feedback exercise-feedback-error" role={status === 'error' ? 'alert' : 'status'}>
          {status === 'error' ? result.error : 'This exercise could not be found.'}
        </p>
      </main>
    )
  }

  const name = getExerciseName(exercise)
  const startImage = getExerciseImageUrl(exercise.images?.flat?.start)
  const peakImage = getExerciseImageUrl(exercise.images?.flat?.peak)
  const instructions = getExerciseInstructions(exercise)
  const benefitsValue = exercise.benefits_en || exercise.benefits
  const benefits = Array.isArray(benefitsValue)
    ? benefitsValue
    : benefitsValue
      ? [benefitsValue]
      : [`This ${formatLabel(exercise.body_part).toLowerCase()} exercise may support strength and movement control when performed with appropriate form.`]

  return (
    <main className="exercise-page exercise-detail-page">
      <Link className="exercise-back-link" to="/library"><ArrowLeft size={17} aria-hidden="true" /> Exercise database</Link>

      <header className="exercise-detail-header">
        <p className="exercise-eyebrow">Exercise guide</p>
        <h1>{name}</h1>
        <span className="exercise-body-badge">{formatLabel(exercise.body_part)}</span>
      </header>

      <div className="exercise-detail-layout">
        <section className="exercise-detail-main">
          <div className="exercise-positions" aria-label={`${name} start and peak positions`}>
            <figure>
              {startImage
                ? <img src={startImage} alt={`${name} starting position`} />
                : <div className="exercise-image-placeholder">Start position unavailable</div>}
              <figcaption>Start</figcaption>
            </figure>
            <figure>
              {peakImage
                ? <img src={peakImage} alt={`${name} peak position`} />
                : <div className="exercise-image-placeholder">Peak position unavailable</div>}
              <figcaption>Peak</figcaption>
            </figure>
          </div>

          <section className="exercise-detail-section">
            <h2>Instructions</h2>
            {instructions.length ? (
              <ol className="exercise-instructions">
                {instructions.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}
              </ol>
            ) : (
              <p className="exercise-muted">No instructions are available for this exercise.</p>
            )}
          </section>

          <section className="exercise-detail-section">
            <h2>Benefits</h2>
            <ul className="exercise-benefits">
              {benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
            </ul>
            <p className="exercise-disclaimer">General exercise information only; this is not medical advice.</p>
          </section>
        </section>

        <aside className="exercise-equipment-panel">
          <div className="exercise-equipment-icon"><Dumbbell size={20} aria-hidden="true" /></div>
          <h2>Equipment</h2>
          <p>{formatLabel(exercise.equipment)}</p>
          {exercise.difficulty && (
            <>
              <h3>Difficulty</h3>
              <p>{formatLabel(exercise.difficulty)}</p>
            </>
          )}
          {Array.isArray(exercise.primary_muscles) && exercise.primary_muscles.length > 0 && (
            <>
              <h3>Primary muscles</h3>
              <p>{exercise.primary_muscles.map(formatLabel).join(', ')}</p>
            </>
          )}
        </aside>
      </div>

      <footer className="exercise-attribution">
        Exercise data by <a href={EXERCISE_DATA_ATTRIBUTION_URL} target="_blank" rel="noreferrer">RepDB (repdb.co)</a>
      </footer>
    </main>
  )
}
