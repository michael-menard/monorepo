import React, { useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'

export interface ScatterPlotDataPoint {
  x: number
  y: number
  category: string
  layer?: string
  label?: string
  shape?: 'circle' | 'square' | 'diamond'
  [key: string]: any // Allow additional properties
}

export interface ScatterPlotProps {
  data: ScatterPlotDataPoint[]
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
  layered?: boolean
  layerOpacity?: { [key: string]: number }
  animate?: boolean
  duration?: number
  className?: string
}

export const ScatterPlot: React.FC<ScatterPlotProps> = ({
  data,
  width = 600,
  height = 400,
  margin = { top: 20, right: 120, bottom: 60, left: 80 },
  xLabel = 'X Axis',
  yLabel = 'Y Axis',
  colors = [
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#6366F1', // Indigo
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#84CC16', // Lime
  ],
  layered = false,
  layerOpacity = { MOCs: 0.9, Sets: 0.7, Wishlist: 0.5 },
  animate = true,
  duration = 1000,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement>(null)

  // State for toggling layers and categories
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set())
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(new Set())

  // Initialize visible sets when data changes
  useEffect(() => {
    if (data && data.length > 0) {
      const categories = [...new Set(data.map(d => d.category))]
      const layers = layered ? [...new Set(data.map(d => d.layer || 'default'))] : ['default']

      setVisibleCategories(new Set(categories))
      setVisibleLayers(new Set(layers))
    }
  }, [data, layered])

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

    // Filter data based on visibility
    const filteredData = data.filter(d => {
      const layerVisible = visibleLayers.has(d.layer || 'default')
      const categoryVisible = visibleCategories.has(d.category)
      return layerVisible && categoryVisible
    })

    // Get unique categories and create color scale
    const categories = [...new Set(data.map(d => d.category))]
    const colorScale = d3.scaleOrdinal<string>().domain(categories).range(colors)

    // Set up scales using all data (not filtered) to maintain consistent scale
    const xExtent = d3.extent(data, d => d.x) as [number, number]
    const yExtent = d3.extent(data, d => d.y) as [number, number]

    // Add padding to the domains
    const xPadding = (xExtent[1] - xExtent[0]) * 0.1
    const yPadding = (yExtent[1] - yExtent[0]) * 0.1

    const xScale = d3
      .scaleLinear()
      .domain([Math.max(0, xExtent[0] - xPadding), xExtent[1] + xPadding])
      .range([0, innerWidth])

    const yScale = d3
      .scaleLinear()
      .domain([Math.max(0, yExtent[0] - yPadding), yExtent[1] + yPadding])
      .range([innerHeight, 0])

    // Add axes
    const xAxis = g
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${innerHeight})`)

    const yAxis = g.append('g').attr('class', 'y-axis')

    // Style and add axes
    xAxis
      .call(d3.axisBottom(xScale).tickFormat(d3.format('d')))
      .selectAll('text')
      .style('font-size', '12px')
      .style('fill', '#6B7280')

    yAxis
      .call(d3.axisLeft(yScale).tickFormat(d3.format('$,.0f')))
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
          .tickSize(-innerWidth)
          .tickFormat(() => ''),
      )
      .style('stroke-dasharray', '3,3')
      .style('opacity', 0.3)

    // Add axis labels
    g.append('text')
      .attr('class', 'x-label')
      .attr('text-anchor', 'middle')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 45)
      .style('font-size', '14px')
      .style('font-weight', '500')
      .style('fill', '#374151')
      .text(xLabel)

    g.append('text')
      .attr('class', 'y-label')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -50)
      .style('font-size', '14px')
      .style('font-weight', '500')
      .style('fill', '#374151')
      .text(yLabel)

    // Helper function to create different shapes
    const createShape = (selection: any, shape: string = 'circle') => {
      switch (shape) {
        case 'square':
          return selection
            .append('rect')
            .attr('width', 12)
            .attr('height', 12)
            .attr('x', (d: ScatterPlotDataPoint) => xScale(d.x) - 6)
            .attr('y', (d: ScatterPlotDataPoint) => yScale(d.y) - 6)
        case 'diamond':
          return selection.append('path').attr('d', (d: ScatterPlotDataPoint) => {
            const x = xScale(d.x)
            const y = yScale(d.y)
            return `M ${x} ${y - 8} L ${x + 6} ${y} L ${x} ${y + 8} L ${x - 6} ${y} Z`
          })
        default: // circle
          return selection
            .append('circle')
            .attr('cx', (d: ScatterPlotDataPoint) => xScale(d.x))
            .attr('cy', (d: ScatterPlotDataPoint) => yScale(d.y))
            .attr('r', animate ? 0 : 6)
      }
    }

    // Group filtered data by layer if layered mode
    const layerGroups = layered
      ? d3.group(filteredData, d => d.layer || 'default')
      : new Map([['default', filteredData]])

    // Render each layer
    layerGroups.forEach((layerData, layerName) => {
      const layerGroup = g
        .append('g')
        .attr('class', `layer layer-${layerName.toLowerCase().replace(/[^a-z0-9]/g, '')}`)

      // Group by shape within each layer
      const shapeGroups = d3.group(layerData, d => d.shape || 'circle')

      shapeGroups.forEach((shapeData, shape) => {
        const shapeGroup = layerGroup.append('g').attr('class', `shape-group shape-${shape}`)

        const dots = shapeGroup.selectAll(`.dot-${shape}`).data(shapeData).enter()

        const dotElements = createShape(dots, shape)
          .attr('class', `dot dot-${shape}`)
          .attr('fill', (d: ScatterPlotDataPoint) => colorScale(d.category))
          .attr('stroke', '#fff')
          .attr('stroke-width', layered ? 1.5 : 2)
          .style('opacity', animate ? 0 : layered ? layerOpacity[layerName] || 0.7 : 0.8)

        // Add hover effects
        dotElements
          .on('mouseover', function (this: any, _event: any, d: ScatterPlotDataPoint) {
            const element = d3.select(this)
            const currentOpacity = layered ? layerOpacity[layerName] || 0.7 : 0.8

            // Scale up effect based on shape
            if (shape === 'circle') {
              element.transition().duration(200).attr('r', 8)
            } else if (shape === 'square') {
              element
                .transition()
                .duration(200)
                .attr('width', 16)
                .attr('height', 16)
                .attr('x', xScale(d.x) - 8)
                .attr('y', yScale(d.y) - 8)
            }

            element.style('opacity', Math.min(currentOpacity + 0.3, 1))

            // Add tooltip
            const tooltip = g
              .append('g')
              .attr('class', 'tooltip')
              .attr('transform', `translate(${xScale(d.x)}, ${yScale(d.y) - 20})`)

            const layerText = layered && d.layer ? `${d.layer} - ` : ''
            const text = tooltip
              .append('text')
              .attr('text-anchor', 'middle')
              .style('font-size', '12px')
              .style('font-weight', '500')
              .style('fill', '#99F6E4')
              .text(d.label || `${layerText}${d.category}: ${d.x} pieces, $${d.y}`)

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
          .on('mouseout', function (this: any, _event: any, d: ScatterPlotDataPoint) {
            const element = d3.select(this)
            const currentOpacity = layered ? layerOpacity[layerName] || 0.7 : 0.8

            // Scale back down based on shape
            if (shape === 'circle') {
              element.transition().duration(200).attr('r', 6)
            } else if (shape === 'square') {
              element
                .transition()
                .duration(200)
                .attr('width', 12)
                .attr('height', 12)
                .attr('x', xScale(d.x) - 6)
                .attr('y', yScale(d.y) - 6)
            }

            element.style('opacity', currentOpacity)
            g.select('.tooltip').remove()
          })

        // Animate dots
        if (animate) {
          if (shape === 'circle') {
            dotElements
              .transition()
              .duration(duration)
              .delay((_d: any, i: number) => i * 50)
              .attr('r', 6)
              .style('opacity', layered ? layerOpacity[layerName] || 0.7 : 0.8)
          } else {
            dotElements
              .transition()
              .duration(duration)
              .delay((_d: any, i: number) => i * 50)
              .style('opacity', layered ? layerOpacity[layerName] || 0.7 : 0.8)
          }
        }
      })
    })

    // Add legend
    const legend = g
      .append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${innerWidth + 20}, 20)`)

    let legendY = 0

    // Show layer legend if layered
    if (layered) {
      const allLayers = [...new Set(data.map(d => d.layer || 'default'))]
      allLayers.forEach(layerName => {
        const isVisible = visibleLayers.has(layerName)
        const legendItem = legend
          .append('g')
          .attr('transform', `translate(0, ${legendY})`)
          .style('cursor', 'pointer')
          .style('opacity', isVisible ? 1 : 0.3)

        // Show shape for layer
        const layerData = data.filter(d => (d.layer || 'default') === layerName)
        const commonShape = layerData[0]?.shape || 'circle'

        if (commonShape === 'circle') {
          legendItem
            .append('circle')
            .attr('cx', 8)
            .attr('cy', 0)
            .attr('r', 6)
            .attr('fill', '#6B7280')
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5)
            .style('opacity', layerOpacity[layerName] || 0.7)
        } else if (commonShape === 'square') {
          legendItem
            .append('rect')
            .attr('x', 2)
            .attr('y', -6)
            .attr('width', 12)
            .attr('height', 12)
            .attr('fill', '#6B7280')
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5)
            .style('opacity', layerOpacity[layerName] || 0.7)
        } else if (commonShape === 'diamond') {
          legendItem
            .append('path')
            .attr('d', 'M 8 -8 L 14 0 L 8 8 L 2 0 Z')
            .attr('fill', '#6B7280')
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5)
            .style('opacity', layerOpacity[layerName] || 0.7)
        }

        legendItem
          .append('text')
          .attr('x', 20)
          .attr('y', 0)
          .attr('dy', '0.35em')
          .style('font-size', '12px')
          .style('fill', '#99F6E4')
          .style('font-weight', '600')
          .text(layerName)

        // Add click handler for layer toggle
        legendItem.on('click', () => {
          const newVisibleLayers = new Set(visibleLayers)
          if (newVisibleLayers.has(layerName)) {
            newVisibleLayers.delete(layerName)
          } else {
            newVisibleLayers.add(layerName)
          }
          setVisibleLayers(newVisibleLayers)
        })

        legendY += 25
      })

      legendY += 10 // Add spacing between layers and categories
    }

    // Show category legend
    categories.forEach(category => {
      const isVisible = visibleCategories.has(category)
      const legendItem = legend
        .append('g')
        .attr('transform', `translate(0, ${legendY})`)
        .style('cursor', 'pointer')
        .style('opacity', isVisible ? 1 : 0.3)

      legendItem
        .append('circle')
        .attr('cx', 8)
        .attr('cy', 0)
        .attr('r', 4)
        .attr('fill', colorScale(category))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)

      legendItem
        .append('text')
        .attr('x', 20)
        .attr('y', 0)
        .attr('dy', '0.35em')
        .style('font-size', '11px')
        .style('fill', '#99F6E4')
        .style('font-weight', '400')
        .text(category)

      // Add click handler for category toggle
      legendItem.on('click', () => {
        const newVisibleCategories = new Set(visibleCategories)
        if (newVisibleCategories.has(category)) {
          newVisibleCategories.delete(category)
        } else {
          newVisibleCategories.add(category)
        }
        setVisibleCategories(newVisibleCategories)
      })

      legendY += 20
    })
  }, [
    data,
    width,
    height,
    margin,
    xLabel,
    yLabel,
    colors,
    animate,
    duration,
    visibleLayers,
    visibleCategories,
    layered,
    layerOpacity,
  ])

  return (
    <div className={`scatter-plot ${className}`}>
      <svg ref={svgRef} />
    </div>
  )
}

export default ScatterPlot
