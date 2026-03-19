import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StateTag, PriorityTag, PlanStatusTag, GenericTag, EpicTag, WorkflowTag } from '../index'

describe('StateTag', () => {
  it('renders the state label with underscores replaced by spaces', () => {
    render(<StateTag state="in_progress" />)
    expect(screen.getByText('in progress')).toBeTruthy()
  })

  it('applies size prop', () => {
    const { container } = render(<StateTag state="backlog" size="sm" />)
    expect(container.firstChild).toBeTruthy()
  })

  it('applies className passthrough', () => {
    const { container } = render(<StateTag state="completed" className="my-extra" />)
    expect((container.firstChild as HTMLElement).className).toContain('my-extra')
  })

  it('renders unknown states with fallback color', () => {
    render(<StateTag state="unknown_state" />)
    expect(screen.getByText('unknown state')).toBeTruthy()
  })
})

describe('PriorityTag', () => {
  it.each(['P0', 'P1', 'P2', 'P3', 'P4', 'P5'])('renders %s', priority => {
    render(<PriorityTag priority={priority} />)
    expect(screen.getByText(priority)).toBeTruthy()
  })

  it('applies className passthrough', () => {
    const { container } = render(<PriorityTag priority="P1" className="custom" />)
    expect((container.firstChild as HTMLElement).className).toContain('custom')
  })
})

describe('PlanStatusTag', () => {
  it.each(['draft', 'active', 'accepted', 'in-progress', 'implemented', 'blocked'])(
    'renders %s',
    status => {
      render(<PlanStatusTag status={status} />)
      expect(screen.getByText(status)).toBeTruthy()
    },
  )

  it('renders unknown status with fallback', () => {
    render(<PlanStatusTag status="mystery" />)
    expect(screen.getByText('mystery')).toBeTruthy()
  })
})

describe('GenericTag', () => {
  it('renders the label text', () => {
    render(<GenericTag label="tooling" />)
    expect(screen.getByText('tooling')).toBeTruthy()
  })

  it('applies consistent hash-based color for same label', () => {
    const { container: a } = render(<GenericTag label="infra" />)
    const { container: b } = render(<GenericTag label="infra" />)
    const classA = (a.firstChild as HTMLElement).className
    const classB = (b.firstChild as HTMLElement).className
    expect(classA).toBe(classB)
  })
})

describe('EpicTag', () => {
  it('renders with monospace style', () => {
    const { container } = render(<EpicTag label="EPIC-001" />)
    expect((container.firstChild as HTMLElement).className).toContain('font-mono')
    expect(screen.getByText('EPIC-001')).toBeTruthy()
  })
})

describe('WorkflowTag', () => {
  it('dispatches to StateTag for category=state', () => {
    render(<WorkflowTag category="state" value="blocked" />)
    expect(screen.getByText('blocked')).toBeTruthy()
  })

  it('dispatches to PriorityTag for category=priority', () => {
    render(<WorkflowTag category="priority" value="P0" />)
    expect(screen.getByText('P0')).toBeTruthy()
  })

  it('dispatches to PlanStatusTag for category=planStatus', () => {
    render(<WorkflowTag category="planStatus" value="draft" />)
    expect(screen.getByText('draft')).toBeTruthy()
  })

  it('dispatches to GenericTag for category=generic', () => {
    render(<WorkflowTag category="generic" value="feature" />)
    expect(screen.getByText('feature')).toBeTruthy()
  })

  it('dispatches to EpicTag for category=epic', () => {
    render(<WorkflowTag category="epic" value="AUTH" />)
    expect(screen.getByText('AUTH')).toBeTruthy()
  })
})
