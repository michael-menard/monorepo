import { describe, it, expect, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import * as React from 'react'

// Mock router params
vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ instructionId: 'test-instruction-id' }),
}))

// Capture props passed into lazy-loaded module
const instructionsGalleryModuleMock = vi.fn(() => null)

vi.mock('@repo/app-instructions-gallery', () => ({
  __esModule: true,
  default: (props: any) => {
    instructionsGalleryModuleMock(props)
    return React.createElement('div', { 'data-testid': 'instructions-gallery-module' })
  },
}))

import { InstructionsDetail } from '../InstructionsDetailModule'

describe('InstructionsDetailModule', () => {
  it('passes mode="detail" and mocIdOrSlug from route params to the lazy module', async () => {
    render(<InstructionsDetail />)

    await waitFor(() => {
      expect(instructionsGalleryModuleMock).toHaveBeenCalled()
    })

    const props = instructionsGalleryModuleMock.mock.calls[0][0]
    expect(props.mode).toBe('detail')
    expect(props.mocIdOrSlug).toBe('test-instruction-id')
  })
})
