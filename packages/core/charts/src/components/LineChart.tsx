import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'

export interface LineChartDataPoint {
  date: string
  [key: string]: string | number // Allow dynamic category keys
}

interface ProcessedDataPoint {
  date: string
  parsedDate: Date
  [key: string]: string | number | Date // Allow dynamic category keys and parsedDate
}

export interface LineChartProps {
  data: LineChartDataPoint[]
  categories: string[]
  width?: number
  height?: number
  margin?: {
    top: number
    right: number
    bottom: number
    left: number
  }
  colors?: string[]
  animate?: boolean
  duration?: number
  className?: string
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  categories,
  width = 600,
  height = 300,
  margin = { top: 20, right: 80, bottom: 40, left: 40 },
  colors = [
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#6366F1', // Indigo
    '#EC4899', // Pink
    '#14B8A6', // Teal
  ],
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

    // Parse dates and prepare data
    const parseDate = d3.timeParse('%Y-%m')
    const processedData: ProcessedDataPoint[] = data.map(d => ({
      ...d,
      parsedDate: parseDate(d.date) || new Date(),
    }))

    // Set up scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(processedData, d => d.parsedDate) as [Date, Date])
      .range([0, innerWidth])

    const maxValue =
      d3.max(processedData, d =>
        d3.max(categories, category => Number((d as any)[category]) || 0),
      ) || 0

    // Y-axis domain: 0 to (maxValue + 5) for better visual spacing
    const yAxisMax = maxValue + 5
    const yScale = d3.scaleLinear().domain([0, yAxisMax]).range([innerHeight, 0])

    // Line generator will be created dynamically for each category

    // Add axes
    const xAxis = g
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${innerHeight})`)

    const yAxis = g.append('g').attr('class', 'y-axis')

    // Style axes with monthly ticks
    xAxis
      .call(
        d3
          .axisBottom(xScale)
          .ticks(d3.timeMonth.every(1)) // Show every month
          .tickFormat(d3.timeFormat('%b %Y') as any),
      )
      .selectAll('text')
      .style('font-size', '12px')
      .style('fill', '#6B7280')
      .style('text-anchor', 'middle')

    // Generate tick values: 0, 1, 2, 3, ... up to yAxisMax
    const yTickValues = Array.from({ length: yAxisMax + 1 }, (_, i) => i)

    yAxis
      .call(
        d3
          .axisLeft(yScale)
          .tickValues(yTickValues) // Explicit tick values: 0, 1, 2, 3, ...
          .tickFormat(d3.format('d')),
      ) // Force integer format
      .selectAll('text')
      .style('font-size', '12px')
      .style('fill', '#6B7280')

    // Style axis lines
    g.selectAll('.domain').style('stroke', '#D1D5DB')

    g.selectAll('.tick line').style('stroke', '#E5E7EB')

    // Add grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(d3.timeMonth.every(1)) // Monthly grid lines
          .tickSize(-innerHeight)
          .tickFormat(() => ''),
      )
      .style('stroke-dasharray', '3,3')
      .style('opacity', 0.3)

    g.append('g')
      .attr('class', 'grid')
      .call(
        d3
          .axisLeft(yScale)
          .tickValues(yTickValues) // Same tick values as Y-axis
          .tickSize(-innerWidth)
          .tickFormat(() => ''),
      )
      .style('stroke-dasharray', '3,3')
      .style('opacity', 0.3)

    // Draw lines for each category
    categories.forEach((category, index) => {
      const categoryData = processedData.filter(d => Number((d as any)[category]) > 0)

      if (categoryData.length === 0) return

      // Sanitize category name for CSS class (remove special characters)
      const sanitizedCategory = category.toLowerCase().replace(/[^a-z0-9]/g, '')

      const categoryLine = d3
        .line<ProcessedDataPoint>()
        .x(d => xScale(d.parsedDate))
        .y(d => yScale(Number((d as any)[category]) || 0))
        .curve(d3.curveMonotoneX)

      const path = g
        .append('path')
        .datum(categoryData)
        .attr('class', `line line-${sanitizedCategory}`)
        .attr('fill', 'none')
        .attr('stroke', colors[index % colors.length])
        .attr('stroke-width', 2)
        .attr('d', categoryLine)

      // Animate line drawing
      if (animate) {
        const totalLength = path.node()?.getTotalLength() || 0
        path
          .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
          .attr('stroke-dashoffset', totalLength)
          .transition()
          .duration(duration)
          .delay(index * 200)
          .attr('stroke-dashoffset', 0)
      }

      // Add dots for data points
      g.selectAll(`.dot-${sanitizedCategory}`)
        .data(categoryData)
        .enter()
        .append('circle')
        .attr('class', `dot dot-${sanitizedCategory}`)
        .attr('cx', d => xScale(d.parsedDate))
        .attr('cy', d => yScale(Number((d as any)[category]) || 0))
        .attr('r', 4)
        .attr('fill', colors[index % colors.length])
        .style('opacity', animate ? 0 : 1)

      // Animate dots
      if (animate) {
        g.selectAll(`.dot-${sanitizedCategory}`)
          .transition()
          .duration(300)
          .delay(duration + index * 200)
          .style('opacity', 1)
      }
    })

    // Add legend
    const legend = g
      .append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${innerWidth + 10}, 20)`)

    categories.forEach((category, index) => {
      const legendItem = legend.append('g').attr('transform', `translate(0, ${index * 20})`)

      legendItem
        .append('line')
        .attr('x1', 0)
        .attr('x2', 15)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', colors[index % colors.length])
        .attr('stroke-width', 2)

      legendItem
        .append('text')
        .attr('x', 20)
        .attr('y', 0)
        .attr('dy', '0.35em')
        .style('font-size', '12px')
        .style('fill', '#99F6E4')
        .style('font-weight', '500')
        .text(category)
    })
  }, [data, categories, width, height, margin, colors, animate, duration])

  return (
    <div className={`line-chart ${className}`}>
      <svg ref={svgRef} />
    </div>
  )
}

export default LineChart
