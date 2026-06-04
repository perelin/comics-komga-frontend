import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Stars } from './Stars'
import { ReadProgress } from './ReadProgress'
import { StatusDot } from './StatusDot'
import { CoverImage } from './CoverImage'

describe('Stars', () => {
  it('shows the numeric value and a check warning when flagged', () => {
    render(<Stars rating={{ value: 4.2, needsCheck: true }} />)
    expect(screen.getByText('4.20')).toBeInTheDocument()
    expect(screen.getByTestId('rating-check')).toBeInTheDocument()
  })
  it('renders nothing interactive when unrated', () => {
    const { container } = render(<Stars rating={undefined} />)
    expect(container.querySelector('[data-testid="stars"]')).toBeNull()
  })
})

describe('ReadProgress', () => {
  it('renders a Read state when fully read', () => {
    render(<ReadProgress variant="bar" progress={{ read: 5, inProgress: 0, unread: 0, total: 5 }} />)
    expect(screen.getByText(/5\s*\/\s*5/)).toBeInTheDocument()
  })
})

describe('StatusDot', () => {
  it('labels the status', () => {
    render(<StatusDot status="ONGOING" />)
    expect(screen.getByText('Ongoing')).toBeInTheDocument()
  })
})

describe('CoverImage', () => {
  it('falls back to a placeholder on error', () => {
    render(<CoverImage src="/komga/api/v1/series/x/thumbnail" alt="X" />)
    const img = screen.getByAltText('X') as HTMLImageElement
    fireEvent.error(img)
    expect(screen.getByTestId('cover-fallback')).toBeInTheDocument()
  })
})
