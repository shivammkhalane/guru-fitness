import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'

export default function GlobalSearch({ navItems, members, onNavigate, onSelectMember }) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const listId = useId()
  const wrapperRef = useRef(null)

  const results = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return []

    const destinations = navItems
      .filter((item) => item.label.toLowerCase().includes(term))
      .map((item) => ({ type: 'destination', key: item.key, label: item.label }))
    const memberMatches = members
      .filter((member) => [member.name, member.phone, member.memberId].some((value) => String(value || '').toLowerCase().includes(term)))
      .slice(0, 6)
      .map((member) => ({
        type: 'member',
        key: member.memberId,
        label: member.name,
        detail: `Member #${member.memberId}`,
      }))
    return [...destinations, ...memberMatches].slice(0, 8)
  }, [members, navItems, query])

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setIsOpen(false)
    }
    document.addEventListener('pointerdown', handleOutsideClick)
    return () => document.removeEventListener('pointerdown', handleOutsideClick)
  }, [])

  const selectResult = (result) => {
    setQuery('')
    setIsOpen(false)
    if (result.type === 'member') {
      onSelectMember(result.key)
      onNavigate('members')
    } else {
      onNavigate(result.key)
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsOpen(false)
      return
    }
    if (!results.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => (index - 1 + results.length) % results.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      selectResult(results[activeIndex] || results[0])
    }
  }

  return (
    <div className="global-search" ref={wrapperRef}>
      <Search size={17} aria-hidden="true" />
      <input
        type="search"
        value={query}
        placeholder="Search pages and members"
        aria-label="Search pages and members"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={isOpen && results.length > 0}
        onChange={(event) => {
          setQuery(event.target.value)
          setActiveIndex(0)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {isOpen && query.trim() && (
        <div className="global-search-results" id={listId} role="listbox" aria-label="Search results">
          {results.length ? results.map((result, index) => (
            <button
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              className="global-search-result"
              key={`${result.type}:${result.key}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectResult(result)}
            >
              <span>{result.label}</span>
              <small>{result.detail || 'Page'}</small>
            </button>
          )) : <p className="global-search-empty" role="status">No matching pages or members.</p>}
        </div>
      )}
    </div>
  )
}
