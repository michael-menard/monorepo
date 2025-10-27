import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'

export interface HeatmapDataPoint {
  x: string | number // Week number or category
  y: string // Theme/category
  value: number // Intensity value
  label?: string // Optional tooltip label
}

export interface HeatmapProps {
  data: HeatmapDataPoint[]
  width?: number
  height?: number
  margin?: {
    top: number
    right: number
    bottom: number
    left: number
  }
  xLabel?: string
  yLabel?: string
  colorScheme?: string[]
  animate?: boolean
  duration?: number
  className?: string
}

export const Heatmap: React.FC<HeatmapProps> = ({
  data,
  width = 800,
  height = 400,
  margin = { top: 20, right: 20, bottom: 60, left: 100 },
  xLabel = 'X Axis',
  yLabel = 'Y Axis',
  colorScheme = ['#f0f9ff', '#0ea5e9', '#0369a1', '#1e40af', '#1e3a8a'], // Blue gradient
  animate = true,
  duration = 1000,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !data || !Array.isArray(data) || data.length === 0) return

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove()

    // Set up dimensions
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    // Create SVG
    const svg = d3.select(svgRef.current).attr('width', width).attr('height', height)

    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`)

    // Get unique values for axes
    const xValues = [...new Set(data.map(d => d.x))].sort((a, b) => {
      if (typeof a === 'number' && typeof b === 'number') return a - b
      return String(a).localeCompare(String(b))
    })
    const yValues = [...new Set(data.map(d => d.y))].sort()

    // Month names for better readability
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]

    // Function to get month label
    const getMonthLabel = (value: string | number) => {
      const num = typeof value === 'number' ? value : parseInt(String(value))
      return num >= 1 && num <= 12 ? monthNames[num - 1] : String(value)
    }

    // Create scales
    const xScale = d3.scaleBand().domain(xValues.map(String)).range([0, innerWidth]).padding(0.05)

    const yScale = d3.scaleBand().domain(yValues).range([0, innerHeight]).padding(0.05)

    // Color scale
    const maxValue = d3.max(data, d => d.value) || 1
    const colorScale = d3
      .scaleSequential()
      .domain([0, maxValue])
      .interpolator(d3.interpolateRgbBasis(colorScheme))

    // Create data map for quick lookup
    const dataMap = new Map()
    data.forEach(d => {
      dataMap.set(`${d.x}-${d.y}`, d)
    })

    // Create heatmap cells
    const cells = g
      .selectAll('.heatmap-cell')
      .data(
        xValues.flatMap(x =>
          yValues.map(y => ({
            x,
            y,
            data: dataMap.get(`${x}-${y}`) || { x, y, value: 0 },
          })),
        ),
      )
      .enter()
      .append('rect')
      .attr('class', 'heatmap-cell')
      .attr('x', d => xScale(String(d.x)) || 0)
      .attr('y', d => yScale(d.y) || 0)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', d => colorScale(d.data.value))
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 0.5)
      .style('opacity', animate ? 0 : 1)

    // Add hover effects and tooltips
    cells
      .on('mouseover', function (_event, d) {
        d3.select(this).transition().duration(200).attr('stroke-width', 2).attr('stroke', '#99F6E4')

        // Create tooltip
        const tooltip = g
          .append('g')
          .attr('class', 'tooltip')
          .attr(
            'transform',
            `translate(${(xScale(String(d.x)) || 0) + xScale.bandwidth() / 2}, ${(yScale(d.y) || 0) - 10})`,
          )

        const text = tooltip
          .append('text')
          .attr('text-anchor', 'middle')
          .style('font-size', '12px')
          .style('font-weight', '500')
          .style('fill', '#99F6E4')
          .text(d.data.label || `${d.y}: ${d.data.value} instructions purchased`)

        // Add background to tooltip
        const bbox = (text.node() as SVGTextElement).getBBox()
        tooltip
          .insert('rect', 'text')
          .attr('x', bbox.x - 4)
          .attr('y', bbox.y - 2)
          .attr('width', bbox.width + 8)
          .attr('height', bbox.height + 4)
          .attr('fill', 'rgba(0, 0, 0, 0.8)')
          .attr('rx', 4)
      })
      .on('mouseout', function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('stroke-width', 0.5)
          .attr('stroke', '#1e293b')

        g.select('.tooltip').remove()
      })

    // Animate cells
    if (animate) {
      cells
        .transition()
        .duration(duration)
        .delay((_d, i) => i * 10)
        .style('opacity', 1)
    }

    // Add axes
    const xAxis = g
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${innerHeight})`)

    const yAxis = g.append('g').attr('class', 'y-axis')

    // Style and add axes with month names
    xAxis
      .call(d3.axisBottom(xScale).tickFormat(d => getMonthLabel(d)))
      .selectAll('text')
      .style('font-size', '11px')
      .style('fill', '#6B7280')
      .style('text-anchor', 'middle') // No rotation needed for month names

    yAxis
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('font-size', '11px')
      .style('fill', '#6B7280')

    // Style axis lines
    g.selectAll('.domain').style('stroke', '#374151')

    g.selectAll('.tick line').style('stroke', '#374151')

    // Add axis labels
    g.append('text')
      .attr('class', 'x-label')
      .attr('text-anchor', 'middle')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 50)
      .style('font-size', '14px')
      .style('font-weight', '500')
      .style('fill', '#374151')
      .text(xLabel)

    g.append('text')
      .attr('class', 'y-label')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -60)
      .style('font-size', '14px')
      .style('font-weight', '500')
      .style('fill', '#374151')
      .text(yLabel)

    // Add color legend
    const legendWidth = 200
    const legendHeight = 10
    const legend = g
      .append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${innerWidth - legendWidth}, -15)`)

    // Create gradient for legend
    const defs = svg.append('defs')
    const gradient = defs
      .append('linearGradient')
      .attr('id', 'heatmap-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%')

    colorScheme.forEach((color, i) => {
      gradient
        .append('stop')
        .attr('offset', `${(i / (colorScheme.length - 1)) * 100}%`)
        .attr('stop-color', color)
    })

    // Add legend rectangle
    legend
      .append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#heatmap-gradient)')
      .attr('stroke', '#374151')
      .attr('stroke-width', 0.5)

    // Add legend labels
    legend
      .append('text')
      .attr('x', 0)
      .attr('y', legendHeight + 15)
      .style('font-size', '10px')
      .style('fill', '#6B7280')
      .text('0')

    legend
      .append('text')
      .attr('x', legendWidth)
      .attr('y', legendHeight + 15)
      .attr('text-anchor', 'end')
      .style('font-size', '10px')
      .style('fill', '#6B7280')
      .text(maxValue.toString())

    legend
      .append('text')
      .attr('x', legendWidth / 2)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', '500')
      .style('fill', '#374151')
      .text('Instructions Purchased')
  }, [data, width, height, margin, xLabel, yLabel, colorScheme, animate, duration])

  return (
    <div className={`heatmap ${className}`}>
      <svg ref={svgRef} />
    </div>
  )
}

export default Heatmap
