import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'

export interface RadialStackedBarDataPoint {
  theme: string
  setsPurchased: number
  mocInstructionsPurchased: number
  setsBuilt: number
}

export interface RadialStackedBarChartProps {
  data: RadialStackedBarDataPoint[]
  width?: number
  height?: number
  innerRadius?: number
  outerRadius?: number
  colors?: string[]
  animate?: boolean
  duration?: number
  className?: string
  showLegend?: boolean
}

export const RadialStackedBarChart: React.FC<RadialStackedBarChartProps> = ({
  data,
  width = 600,
  height = 600,
  innerRadius = 80,
  outerRadius = 250,
  colors = [
    '#3B82F6', // Blue - Sets Purchased
    '#10B981', // Green - MOC Instructions Purchased
    '#F59E0B', // Amber - Sets Built
  ],
  animate = true,
  duration = 1000,
  className = '',
  showLegend = true,
}) => {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !data || !Array.isArray(data) || data.length === 0) return

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove()

    // Set up dimensions
    const center = { x: width / 2, y: height / 2 }

    // Create SVG
    const svg = d3.select(svgRef.current).attr('width', width).attr('height', height)

    const g = svg.append('g').attr('transform', `translate(${center.x}, ${center.y})`)

    // Data keys for stacking
    const keys = ['setsPurchased', 'mocInstructionsPurchased', 'setsBuilt']

    // Color scale
    const colorScale = d3.scaleOrdinal<string>().domain(keys).range(colors)

    // Stack the data
    const stack = d3
      .stack<RadialStackedBarDataPoint>()
      .keys(keys)
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone)

    const stackedData = stack(data)

    // Get maximum value for scaling
    const maxValue = d3.max(stackedData, layer => d3.max(layer, d => d[1])) || 0

    // Angular scale (one segment per theme)
    const angleScale = d3
      .scaleBand()
      .domain(data.map(d => d.theme))
      .range([0, 2 * Math.PI])
      .padding(0.1)

    // Radial scale (from inner to outer radius based on values)
    const radiusScale = d3.scaleLinear().domain([0, maxValue]).range([innerRadius, outerRadius])

    // Arc generator
    const arc = d3
      .arc<any>()
      .innerRadius((d: any) => radiusScale(d[0]))
      .outerRadius((d: any) => radiusScale(d[1]))
      .startAngle((d: any) => angleScale(d.data.theme) || 0)
      .endAngle((d: any) => (angleScale(d.data.theme) || 0) + angleScale.bandwidth())
      .padAngle(0.01)
      .padRadius(innerRadius)

    // Create groups for each stack layer
    const layers = g
      .selectAll('.layer')
      .data(stackedData)
      .enter()
      .append('g')
      .attr('class', 'layer')
      .attr('fill', (_d, i) => colorScale(keys[i]))

    // Create arcs for each data point in each layer
    const arcs = layers
      .selectAll('.arc')
      .data(d => d)
      .enter()
      .append('path')
      .attr('class', 'arc')
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 1)

    // Add hover effects
    arcs
      .on('mouseover', function (_event, d: any) {
        d3.select(this).transition().duration(200).attr('stroke-width', 3).attr('stroke', '#99F6E4')

        // Create tooltip
        const layerIndex = stackedData.findIndex(layer => layer.includes(d))
        const key = keys[layerIndex]
        const value = d[1] - d[0]

        const keyLabels: { [key: string]: string } = {
          setsPurchased: 'Sets Purchased',
          mocInstructionsPurchased: 'MOC Instructions Purchased',
          setsBuilt: 'Sets Built',
        }

        const tooltip = g.append('g').attr('class', 'tooltip')

        const text = tooltip
          .append('text')
          .attr('text-anchor', 'middle')
          .style('font-size', '14px')
          .style('font-weight', '600')
          .style('fill', '#99F6E4')

        text.append('tspan').attr('x', 0).attr('dy', 0).text(d.data.theme)

        text
          .append('tspan')
          .attr('x', 0)
          .attr('dy', '1.2em')
          .style('font-weight', '400')
          .text(`${keyLabels[key]}: ${value}`)

        // Add background to tooltip
        const bbox = (text.node() as SVGTextElement).getBBox()
        tooltip
          .insert('rect', 'text')
          .attr('x', bbox.x - 8)
          .attr('y', bbox.y - 4)
          .attr('width', bbox.width + 16)
          .attr('height', bbox.height + 8)
          .attr('fill', 'rgba(0, 0, 0, 0.9)')
          .attr('rx', 6)
      })
      .on('mouseout', function () {
        d3.select(this).transition().duration(200).attr('stroke-width', 1).attr('stroke', '#1e293b')

        g.select('.tooltip').remove()
      })

    // Animate arcs
    if (animate) {
      arcs
        .attr('d', arc.innerRadius(innerRadius).outerRadius(innerRadius))
        .transition()
        .duration(duration)
        .delay((_d, i) => i * 100)
        .attr('d', arc)
    } else {
      arcs.attr('d', arc)
    }

    // Add theme labels around the outside
    const labelRadius = outerRadius + 20

    g.selectAll('.theme-label')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'theme-label')
      .attr('transform', d => {
        const angle = (angleScale(d.theme) || 0) + angleScale.bandwidth() / 2
        const x = Math.sin(angle) * labelRadius
        const y = -Math.cos(angle) * labelRadius
        return `translate(${x}, ${y}) rotate(${angle > Math.PI ? (angle * 180) / Math.PI + 90 : (angle * 180) / Math.PI - 90})`
      })
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-size', '12px')
      .style('font-weight', '600')
      .style('fill', '#e2e8f0')
      .text(d => d.theme)

    // Add radial grid lines
    const gridLines = [0.25, 0.5, 0.75, 1.0]

    gridLines.forEach(fraction => {
      const gridRadius = innerRadius + (outerRadius - innerRadius) * fraction

      g.append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', gridRadius)
        .attr('fill', 'none')
        .attr('stroke', '#374151')
        .attr('stroke-width', 0.5)
        .attr('stroke-dasharray', '2,2')
    })

    // Add center circle
    g.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', innerRadius)
      .attr('fill', 'none')
      .attr('stroke', '#64748b')
      .attr('stroke-width', 2)

    // Add center label
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-size', '16px')
      .style('font-weight', '700')
      .style('fill', '#e2e8f0')
      .text('Collection')

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.8em')
      .style('font-size', '12px')
      .style('fill', '#94a3b8')
      .text('by Theme')
  }, [data, width, height, innerRadius, outerRadius, colors, animate, duration])

  const keyLabels = ['Sets Purchased', 'MOC Instructions Purchased', 'Sets Built']

  return (
    <div className={`radial-stacked-bar-chart ${className}`}>
      <div className="flex items-start">
        <svg ref={svgRef} className="flex-shrink-0" />

        {showLegend ? (
          <div className="ml-6 space-y-3">
            <h4 className="text-sm font-semibold text-foreground mb-3">Legend</h4>
            {keyLabels.map((label, index) => (
              <div key={label} className="flex items-center space-x-3">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: colors[index] }} />
                <span className="text-sm text-foreground">{label}</span>
              </div>
            ))}

            <div className="mt-6 text-xs text-muted-foreground">
              <div className="mb-2 font-medium">Reading the Chart:</div>
              <div className="space-y-1">
                <div>• Each segment = one theme</div>
                <div>• Inner to outer = stacked values</div>
                <div>• Hover for exact numbers</div>
                <div>• Larger radius = higher totals</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default RadialStackedBarChart
