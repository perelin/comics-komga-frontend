import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CreatorMatches } from './CreatorMatches'

const chipOf = (name: string) => {
  const el = screen.getByText(name)
  return el.parentElement as HTMLElement
}

describe('CreatorMatches', () => {
  it('renders nothing for an empty match list', () => {
    const { container } = render(<CreatorMatches matches={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a solid chip for a story credit (writer/penciller/inker/colorist)', () => {
    render(<CreatorMatches matches={[{ name: 'Fiona Staples', roles: ['penciller', 'inker'] }]} />)
    expect(screen.getByText('penciller · inker')).toBeInTheDocument()
    expect(chipOf('Fiona Staples').className).toContain('bg-primary/20')
    expect(chipOf('Fiona Staples').className).not.toContain('border-dashed')
  })

  it('renders the dimmed dashed chip for a cover-only credit', () => {
    render(<CreatorMatches matches={[{ name: 'Fiona Staples', roles: ['cover'] }]} />)
    expect(screen.getByText('cover')).toBeInTheDocument()
    expect(chipOf('Fiona Staples').className).toContain('border-dashed')
    expect(chipOf('Fiona Staples').className).toContain('text-muted-foreground')
  })

  it('solid wins when a creator holds both story and cover roles', () => {
    render(<CreatorMatches matches={[{ name: 'Fiona Staples', roles: ['penciller', 'cover'] }]} />)
    expect(chipOf('Fiona Staples').className).toContain('bg-primary/20')
  })

  it('renders one chip per matched creator', () => {
    render(<CreatorMatches matches={[
      { name: 'Fiona Staples', roles: ['penciller'] },
      { name: 'BKV', roles: ['writer', 'letterer'] },
    ]} />)
    expect(screen.getByText('Fiona Staples')).toBeInTheDocument()
    expect(screen.getByText('BKV')).toBeInTheDocument()
    expect(screen.getByText('writer · letterer')).toBeInTheDocument()
  })
})
