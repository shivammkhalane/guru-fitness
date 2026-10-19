export default function AnimatedExerciseCard({ exercise }) {
  if (!exercise) return null

  const { name, sets, reps, muscle, animation_url: animationUrl } = exercise

  return (
    <article className="animated-exercise-card">
      <div className="animated-exercise-media">
        {animationUrl ? (
          <img
            src={animationUrl}
            alt={`${name} exercise demonstration`}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="animated-exercise-placeholder" role="img" aria-label={`${name} demonstration unavailable`}>
            <span>Exercise demo unavailable</span>
          </div>
        )}
        <span className="animated-exercise-media-label">Exercise demo</span>
      </div>

      <div className="animated-exercise-content">
        <span className="animated-exercise-muscle">{muscle || 'Exercise'}</span>
        <h3>{name || 'Workout exercise'}</h3>
        <dl className="animated-exercise-prescription">
          <div>
            <dt>Sets</dt>
            <dd>{sets ?? '—'}</dd>
          </div>
          <div>
            <dt>Reps</dt>
            <dd>{reps ?? '—'}</dd>
          </div>
        </dl>
      </div>
    </article>
  )
}
