import { useEffect, useState } from 'react'
import { ArrowLeft, Cog, Dumbbell, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  EXERCISE_DATA_ATTRIBUTION_URL,
  getExerciseImageUrl,
  getExerciseName,
  getExercises,
} from '../services/exerciseDataset'
import '../App.css'

const BODY_PART_CATEGORIES = ['All', 'Chest', 'Back', 'Legs', 'Biceps', 'Triceps', 'Shoulders']
const EQUIPMENT_CATEGORIES = [
  'Dumbbell',
  'Barbell',
  'Cable Machine',
  'Machine',
  'Bodyweight / Free Weight',
]

function getEquipmentCategory(equipmentName) {
  const equipment = String(equipmentName || '').toLocaleLowerCase().replaceAll('_', ' ')

  if (equipment.includes('dumbbell')) return 'Dumbbell'
  if (equipment.includes('cable') || equipment.includes('pulley')) return 'Cable Machine'
  if (equipment.includes('machine') || equipment.includes('lever') || equipment.includes('smith')) {
    return 'Machine'
  }
  if (
    equipment.includes('barbell')
    || equipment.includes('ez bar')
    || equipment.includes('trap bar')
    || equipment.includes('hex bar')
  ) {
    return 'Barbell'
  }

  return 'Bodyweight / Free Weight'
}

function matchesBodyPartCategory(exercise, category) {
  if (category === 'All') return true

  const bodyPart = String(exercise.body_part || '').toLocaleLowerCase().replaceAll('_', ' ')
  const muscles = [
    ...(Array.isArray(exercise.primary_muscles) ? exercise.primary_muscles : []),
    ...(Array.isArray(exercise.secondary_muscles) ? exercise.secondary_muscles : []),
  ].map((muscle) => String(muscle).toLocaleLowerCase().replaceAll('_', ' '))

  if (category === 'Legs') return bodyPart.includes('leg')
  if (category === 'Biceps') return muscles.some((muscle) => muscle.includes('biceps'))
  if (category === 'Triceps') return muscles.some((muscle) => muscle.includes('triceps'))
  return bodyPart.includes(category.toLocaleLowerCase())
}

export default function ExerciseLibrary() {
  const [exercises, setExercises] = useState([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedEquipment, setSelectedEquipment] = useState('All')
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let isCurrent = true
    getExercises()
      .then((entries) => {
        if (!isCurrent) return
        setExercises(entries)
        setStatus('ready')
      })
      .catch((loadError) => {
        if (!isCurrent) return
        setError(loadError.message || 'Could not load exercises.')
        setStatus('error')
      })

    return () => {
      isCurrent = false
    }
  }, [])

  const normalizedSearch = search.trim().toLocaleLowerCase()
  const filteredExercises = exercises.filter((exercise) => {
    const matchesCategory = matchesBodyPartCategory(exercise, selectedCategory)
    const matchesEquipment = selectedEquipment === 'All'
      || getEquipmentCategory(exercise.equipment) === selectedEquipment
    const matchesSearch = !normalizedSearch || [
        getExerciseName(exercise),
        exercise.body_part,
        exercise.equipment,
        exercise.category,
      ].some((value) => String(value || '').toLocaleLowerCase().includes(normalizedSearch))

    return matchesCategory && matchesEquipment && matchesSearch
  })
  const groupedExercises = selectedEquipment === 'All'
    ? EQUIPMENT_CATEGORIES
      .map((category) => ({
        category,
        exercises: filteredExercises.filter((exercise) => getEquipmentCategory(exercise.equipment) === category),
      }))
      .filter((group) => group.exercises.length > 0)
    : [{
        category: selectedEquipment,
        exercises: filteredExercises,
      }]

  const renderExerciseCard = (exercise) => {
    const image = getExerciseImageUrl(exercise.images?.flat?.start)
    const name = getExerciseName(exercise)

    return (
      <Link
        className="exercise-card"
        key={exercise.id}
        to={`/exercise/${encodeURIComponent(exercise.id)}`}
      >
        <div className="exercise-card-image-wrap">
          {image ? (
            <img src={image} alt="" loading="lazy" />
          ) : (
            <div className="exercise-image-placeholder" aria-hidden="true">GF</div>
          )}
        </div>
        <div className="exercise-card-content">
          <h3>{name}</h3>
          <span className="exercise-body-badge">{exercise.body_part || 'General'}</span>
        </div>
      </Link>
    )
  }

  return (
    <main className="exercise-page exercise-library-page">
      <header className="exercise-page-header">
        <Link className="exercise-back-link" to="/">
          <ArrowLeft size={17} aria-hidden="true" /> Dashboard
        </Link>
        <p className="exercise-eyebrow">Guru Fitness · Training resources</p>
        <h1>Exercise library</h1>
        <p className="exercise-page-description">
          Browse exercises by movement, body part, and equipment.
        </p>
        <label className="exercise-search">
          <Search size={18} aria-hidden="true" />
          <span className="exercise-visually-hidden">Search exercises</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search exercises, body parts, or equipment"
          />
        </label>
        {status === 'ready' && (
          <nav className="exercise-category-tabs" aria-label="Filter exercises by body part">
            {BODY_PART_CATEGORIES.map((category) => (
              <button
                type="button"
                className={`exercise-category-tab ${selectedCategory === category ? 'active' : ''}`}
                key={category}
                aria-pressed={selectedCategory === category}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </nav>
        )}
        {status === 'ready' && (
          <nav className="exercise-category-tabs exercise-equipment-tabs" aria-label="Filter exercises by equipment">
            <button
              type="button"
              className={`exercise-category-tab ${selectedEquipment === 'All' ? 'active' : ''}`}
              aria-pressed={selectedEquipment === 'All'}
              onClick={() => setSelectedEquipment('All')}
            >
              All Equipment
            </button>
            {EQUIPMENT_CATEGORIES.map((category) => (
              <button
                type="button"
                className={`exercise-category-tab ${selectedEquipment === category ? 'active' : ''}`}
                key={category}
                aria-pressed={selectedEquipment === category}
                onClick={() => setSelectedEquipment(category)}
              >
                {category}
              </button>
            ))}
          </nav>
        )}
      </header>

      {status === 'loading' && <p className="exercise-feedback" role="status">Loading exercise database…</p>}
      {status === 'error' && (
        <div className="exercise-feedback exercise-feedback-error" role="alert">
          {error} Please try again later.
        </div>
      )}
      {status === 'ready' && filteredExercises.length === 0 && (
        <p className="exercise-feedback" role="status">No exercises match that search.</p>
      )}

      {status === 'ready' && filteredExercises.length > 0 && (
        <div className="exercise-equipment-groups">
          {groupedExercises.map((group) => (
            <section className="exercise-equipment-group" key={group.category} aria-label={`${group.category} exercises`}>
              {selectedEquipment === 'All' && (
                <h2 className="exercise-equipment-heading">
                  {group.category === 'Machine'
                    ? <Cog size={17} aria-hidden="true" />
                    : <Dumbbell size={17} aria-hidden="true" />}
                  {group.category} exercises
                  <span className="exercise-equipment-count">{group.exercises.length}</span>
                </h2>
              )}
              <div className="exercise-grid">
                {group.exercises.map(renderExerciseCard)}
              </div>
            </section>
          ))}
        </div>
      )}

      <footer className="exercise-attribution">
        Exercise data by <a href={EXERCISE_DATA_ATTRIBUTION_URL} target="_blank" rel="noreferrer">RepDB (repdb.co)</a>
      </footer>
    </main>
  )
}
