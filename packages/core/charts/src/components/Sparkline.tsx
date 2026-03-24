import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'

export interface SparklineProps {
  data: (number | null)[]
  width?: number
  height?: number
  color?: string
  fillOpacity?: number
  className?: string
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 120,
  height = 32,
  color = '#06b6d4',
  fillOpacity = 0.1,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return

    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3
      .select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'none')

    const padding = 2

    // Filter out nulls for extent calculation
    const validData = data.filter((d): d is number => d !== null)
    if (validData.length === 0) return

    const yExtent = d3.extent(validData) as [number, number]
    const yMin = Math.max(0, yExtent[0] - 5)
    const yMax = yExtent[1] + 5

    const xScale = d3
      .scaleLinear()
      .domain([0, data.length - 1])
      .range([padding, width - padding])

    const yScale = d3
      .scaleLinear()
      .domain([yMin, yMax])
      .range([height - padding, padding])

    // Build segments (skip nulls to create gaps)
    const segments: { x: number; y: number }[][] = []
    let current: { x: number; y: number }[] = []

    data.forEach((d, i) => {
      if (d !== null) {
        current.push({ x: xScale(i), y: yScale(d) })
      } else if (current.length > 0) {
        segments.push(current)
        current = []
      }
    })
    if (current.length > 0) segments.push(current)

    const line = d3
      .line<{ x: number; y: number }>()
      .x(d => d.x)
      .y(d => d.y)
      .curve(d3.curveMonotoneX)

    const area = d3
      .area<{ x: number; y: number }>()
      .x(d => d.x)
      .y0(height - padding)
      .y1(d => d.y)
      .curve(d3.curveMonotoneX)

    for (const seg of segments) {
      // Area fill
      svg
        .append('path')
        .datum(seg)
        .attr('d', area)
        .attr('fill', color)
        .attr('fill-opacity', fillOpacity)

      // Line
      svg
        .append('path')
        .datum(seg)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 1.5)
    }
  }, [data, width, height, color, fillOpacity])

  return (
    <div className={`sparkline ${className}`} style={{ width, height }}>
      <svg ref={svgRef} width={width} height={height} />
    </div>
  )
}

export default Sparkline
