import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'

export interface GroupedBarDataPoint {
  category: string // Theme name
  groups: { [key: string]: number } // e.g., { "MOCs Created": 5, "Sets Purchased": 2, "Sets Browsed": 15 }
}

export interface GroupedBarChartProps {
  data: GroupedBarDataPoint[]
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
  colors?: string[]
  animate?: boolean
  duration?: number
  className?: string
}

export const GroupedBarChart: React.FC<GroupedBarChartProps> = ({
  data,
  width = 800,
  height = 400,
  margin = { top: 20, right: 120, bottom: 60, left: 60 },
  xLabel = 'Categories',
  yLabel = 'Count',
  colors = [
    '#3B82F6', // Blue - MOCs Created
    '#10B981', // Green - Sets Purchased
    '#F59E0B', // Amber - Sets Browsed
    '#8B5CF6', // Purple - Additional category
    '#EF4444', // Red - Additional category
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

    // Get all group keys
    const groupKeys = [...new Set(data.flatMap(d => Object.keys(d.groups)))]
    const categories = data.map(d => d.category)

    // Create scales
    const xScale = d3.scaleBand().domain(categories).range([0, innerWidth]).padding(0.1)

    const xSubScale = d3.scaleBand().domain(groupKeys).range([0, xScale.bandwidth()]).padding(0.05)

    const maxValue = d3.max(data, d => d3.max(Object.values(d.groups))) || 0
    const yScale = d3.scaleLinear().domain([0, maxValue]).range([innerHeight, 0])

    // Color scale
    const colorScale = d3.scaleOrdinal<string>().domain(groupKeys).range(colors)

    // Create bars
    const categoryGroups = g
      .selectAll('.category-group')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'category-group')
      .attr('transform', d => `translate(${xScale(d.category)}, 0)`)

    // Define bar data type
    interface BarData {
      key: string
      value: number
      category: string
    }

    // Add bars for each group
    categoryGroups
      .selectAll('.bar')
      .data((d: GroupedBarDataPoint) =>
        groupKeys.map(
          key =>
            ({
              key,
              value: d.groups[key] || 0,
              category: d.category,
            }) as BarData,
        ),
      )
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xSubScale(d.key) || 0)
      .attr('y', innerHeight)
      .attr('width', xSubScale.bandwidth())
      .attr('height', 0)
      .attr('fill', (d: any) => colorScale(d.key))
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 0.5)

    // Add hover effects
    categoryGroups
      .selectAll('.bar')
      .on('mouseover', function (_event: any, d: any) {
        d3.select(this).transition().duration(200).attr('stroke-width', 2).attr('stroke', '#99F6E4')

        // Create tooltip
        const tooltip = g
          .append('g')
          .attr('class', 'tooltip')
          .attr(
            'transform',
            `translate(${(xScale(d.category) || 0) + (xSubScale(d.key) || 0) + xSubScale.bandwidth() / 2}, ${yScale(d.value) - 10})`,
          )

        const text = tooltip
          .append('text')
          .attr('text-anchor', 'middle')
          .style('font-size', '12px')
          .style('font-weight', '500')
          .style('fill', '#99F6E4')
          .text(`${d.category} - ${d.key}: ${d.value}`)

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

    // Animate bars
    if (animate) {
      categoryGroups
        .selectAll('.bar')
        .transition()
        .duration(duration)
        .delay((_d: any, i: number) => i * 100)
        .attr('y', (d: any) => yScale(d.value))
        .attr('height', (d: any) => innerHeight - yScale(d.value))
    } else {
      categoryGroups
        .selectAll('.bar')
        .attr('y', (d: any) => yScale(d.value))
        .attr('height', (d: any) => innerHeight - yScale(d.value))
    }

    // Add axes
    const xAxis = g
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${innerHeight})`)

    const yAxis = g.append('g').attr('class', 'y-axis')

    // Style and add axes
    xAxis
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('font-size', '12px')
      .style('fill', '#6B7280')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')

    yAxis
      .call(d3.axisLeft(yScale).tickFormat(d3.format('d')))
      .selectAll('text')
      .style('font-size', '12px')
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
      .attr('y', -40)
      .style('font-size', '14px')
      .style('font-weight', '500')
      .style('fill', '#374151')
      .text(yLabel)

    // Add legend
    const legend = g
      .append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${innerWidth + 20}, 20)`)

    groupKeys.forEach((key, index) => {
      const legendItem = legend.append('g').attr('transform', `translate(0, ${index * 25})`)

      legendItem
        .append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', colorScale(key))
        .attr('stroke', '#1e293b')
        .attr('stroke-width', 0.5)

      legendItem
        .append('text')
        .attr('x', 20)
        .attr('y', 12)
        .style('font-size', '12px')
        .style('fill', '#99F6E4')
        .style('font-weight', '500')
        .text(key)
    })
  }, [data, width, height, margin, xLabel, yLabel, colors, animate, duration])

  return (
    <div className={`grouped-bar-chart ${className}`}>
      <svg ref={svgRef} />
    </div>
  )
}

export default GroupedBarChart
