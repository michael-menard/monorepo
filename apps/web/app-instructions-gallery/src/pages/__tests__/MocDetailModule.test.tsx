import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Instruction } from '@repo/api-client/types/api-responses'
import * as rtkModule from '@repo/api-client/rtk/instructions-api'
import { MocDetailModule } from '../MocDetailModule'

vi.mock('@repo/api-client/rtk/instructions-api')

const INSTRUCTION: Instruction = {
  id: 'instr-1',
  name: 'Test Instruction',
  description: 'Test description',
  thumbnail: 'https://example.com/thumb.jpg',
  images: ['https://example.com/img1.jpg'],
  pieceCount: 1234,
  theme: 'Space',
  tags: ['tag1'],
  pdfUrl: 'https://example.com/instructions.pdf',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-02T00:00:00Z',
  isFavorite: false,
}

describe('MocDetailModule', () => {
  it('maps instruction API data into Moc dashboard type and renders dashboard', () => {
    vi.spyOn(rtkModule, 'useGetInstructionByIdQuery').mockReturnValue({
      data: { data: INSTRUCTION },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: vi.fn(),
    } as any)

    render(<MocDetailModule mocIdOrSlug={INSTRUCTION.id} />)

    expect(screen.getByTestId('moc-detail-dashboard')).toBeInTheDocument()
    expect(screen.getByText(INSTRUCTION.name)).toBeInTheDocument()
  })
})
