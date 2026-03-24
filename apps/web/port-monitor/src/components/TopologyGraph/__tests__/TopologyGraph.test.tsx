import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TopologyGraph } from '..'

const mockTopology = {
  nodes: [
    { key: 'MAIN_APP_PORT', name: 'Main App', port: 8000, kind: 'frontend' as const },
    { key: 'LEGO_API_PORT', name: 'Lego Api', port: 9100, kind: 'backend' as const },
  ],
  edges: [{ from: 'MAIN_APP_PORT', to: 'LEGO_API_PORT' }],
}

describe('TopologyGraph', () => {
  it('renders nothing when no topology', () => {
    const { container } = render(<TopologyGraph />)
    expect(container.firstChild).toBeNull()
  })

  it('renders frontend and backend sections', () => {
    render(<TopologyGraph topology={mockTopology} />)
    expect(screen.getByText('Frontends')).toBeInTheDocument()
    expect(screen.getByText('Backends')).toBeInTheDocument()
    expect(screen.getByText('Main App')).toBeInTheDocument()
    expect(screen.getByText('Lego Api')).toBeInTheDocument()
  })

  it('shows dependency arrows', () => {
    render(<TopologyGraph topology={mockTopology} />)
    expect(screen.getAllByText(/Lego Api/)).toHaveLength(2) // backend node + dependency arrow
  })

  it('collapses on header click', async () => {
    render(<TopologyGraph topology={mockTopology} />)
    await userEvent.click(screen.getByText('Service Topology'))
    expect(screen.queryByText('Frontends')).not.toBeInTheDocument()
  })
})
