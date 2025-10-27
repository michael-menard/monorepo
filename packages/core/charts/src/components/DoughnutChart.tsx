import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'

export interface DoughnutChartData {
  label: string
  value: number
  color: string
}

export interface DoughnutChartProps {
  data: DoughnutChartData[]
  width?: number
  height?: number
  innerRadius?: number
  outerRadius?: number
  showLabels?: boolean
  showLeaderLines?: boolean
  showLegend?: boolean
  centerText?: {
    primary: string
    secondary?: string
  }
  className?: string
  animate?: boolean
  duration?: number
}

export const DoughnutChart: React.FC<DoughnutChartProps> = ({
  data,
  width = 200,
  height = 200,
  innerRadius,
  outerRadius,
  showLabels = false,
  showLeaderLines = false,
  showLegend = false,
  centerText,
  className = '',
  animate = true,
  duration = 750,
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate radii based on dimensions - extra chunky proportions
  const radius = Math.min(width, height) / 2
  const defaultInnerRadius = radius * 0.25 // Much thicker ring
  const defaultOuterRadius = radius * 0.85

  const finalInnerRadius = innerRadius ?? defaultInnerRadius
  const finalOuterRadius = outerRadius ?? defaultOuterRadius

  useEffect(() => {
    if (!svgRef.current || !data.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove() // Clear previous render

    // Create main group
    const g = svg.append('g').attr('transform', `translate(${width / 2}, ${height / 2})`)

    // Create pie generator
    const pie = d3
      .pie<DoughnutChartData>()
      .value(d => d.value)
      .sort(null)

    // Create arc generator
    const arc = d3
      .arc<d3.PieArcDatum<DoughnutChartData>>()
      .innerRadius(finalInnerRadius)
      .outerRadius(finalOuterRadius)

    // Create arcs
    const arcs = g.selectAll('.arc').data(pie(data)).enter().append('g').attr('class', 'arc')

    // Add paths with chunky flat styling - no stroke
    const paths = arcs
      .append('path')
      .attr('fill', d => d.data.color)
      .attr('stroke', 'none') // No stroke for seamless flat look
      .style('filter', 'none') // Flat, no shadows
      .style('shape-rendering', 'geometricPrecision') // Crisp edges

    if (animate) {
      // Animate the arcs
      paths
        .attr('d', d => {
          const endAngle = d.startAngle // Start with no arc
          return arc({ ...d, endAngle }) || ''
        })
        .transition()
        .duration(duration)
        .attrTween('d', function (d) {
          const interpolate = d3.interpolate(
            { startAngle: d.startAngle, endAngle: d.startAngle },
            { startAngle: d.startAngle, endAngle: d.endAngle },
          )
          return function (t) {
            const interpolated = interpolate(t)
            return arc({ ...d, ...interpolated }) || ''
          }
        })
    } else {
      paths.attr('d', arc)
    }

    // Add labels if requested
    if (showLabels) {
      const labelArc = d3
        .arc<d3.PieArcDatum<DoughnutChartData>>()
        .innerRadius(finalOuterRadius + 10)
        .outerRadius(finalOuterRadius + 10)

      arcs
        .append('text')
        .attr('transform', d => `translate(${labelArc.centroid(d)})`)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', '500')
        .style('fill', '#374151')
        .text(d => `${d.data.label}: ${d.data.value}`)
    }

    // Add leader lines and labels if enabled
    if (showLeaderLines && data.length > 0) {
      const labelRadius = finalOuterRadius + 30 // Distance for labels
      const lineRadius = finalOuterRadius + 10 // Distance for line bend
      const pieData = pie(data) // Generate pie data for angles
      const filteredPieData = pieData.filter(d => d.data.value > 0)

      // Calculate initial label positions
      const labelPositions = filteredPieData.map(d => {
        const angle = (d.startAngle + d.endAngle) / 2
        const midAngle = angle - Math.PI / 2

        const lineStartX = Math.cos(midAngle) * finalOuterRadius
        const lineStartY = Math.sin(midAngle) * finalOuterRadius
        const lineBendX = Math.cos(midAngle) * lineRadius
        const lineBendY = Math.sin(midAngle) * lineRadius
        const labelX = Math.cos(midAngle) * labelRadius
        const labelY = Math.sin(midAngle) * labelRadius

        const isRightSide = labelX > 0
        const horizontalLineLength = 20
        const horizontalEndX = labelX + (isRightSide ? horizontalLineLength : -horizontalLineLength)

        return {
          data: d.data,
          angle: midAngle,
          lineStartX,
          lineStartY,
          lineBendX,
          lineBendY,
          labelX,
          labelY: labelY, // Initial position
          horizontalEndX,
          isRightSide,
          originalY: labelY, // Store original position for reference
        }
      })

      // Collision detection and adjustment
      const minLabelSpacing = 16 // Minimum pixels between labels

      // Separate left and right side labels for independent adjustment
      const leftLabels = labelPositions
        .filter(pos => !pos.isRightSide)
        .sort((a, b) => a.labelY - b.labelY)
      const rightLabels = labelPositions
        .filter(pos => pos.isRightSide)
        .sort((a, b) => a.labelY - b.labelY)

      // Adjust positions to prevent overlaps
      const adjustLabelPositions = (labels: typeof labelPositions) => {
        for (let i = 1; i < labels.length; i++) {
          const current = labels[i]
          const previous = labels[i - 1]

          if (current.labelY - previous.labelY < minLabelSpacing) {
            current.labelY = previous.labelY + minLabelSpacing
          }
        }
      }

      adjustLabelPositions(leftLabels)
      adjustLabelPositions(rightLabels)

      // Render leader lines and labels with adjusted positions
      ;[...leftLabels, ...rightLabels].forEach(pos => {
        // Draw the leader line (from arc to bend point to horizontal line)
        g.append('path')
          .attr('class', 'leader-line')
          .attr(
            'd',
            `M ${pos.lineStartX} ${pos.lineStartY} L ${pos.lineBendX} ${pos.lineBendY} L ${pos.horizontalEndX} ${pos.labelY}`,
          )
          .attr('stroke', '#6B7280')
          .attr('stroke-width', 1)
          .attr('fill', 'none')
          .style('opacity', 0)
          .transition()
          .duration(animate ? duration + 200 : 0)
          .style('opacity', 1)

        // Add label text with lighter color that works in both themes
        g.append('text')
          .attr('class', 'leader-label')
          .attr('x', pos.horizontalEndX + (pos.isRightSide ? 5 : -5))
          .attr('y', pos.labelY)
          .attr('text-anchor', pos.isRightSide ? 'start' : 'end')
          .attr('dominant-baseline', 'middle')
          .style('font-size', '12px')
          .style('font-weight', '600')
          .style('fill', '#99F6E4') // Light teal for good contrast and visibility
          .style('opacity', 0)
          .text(`${pos.data.label} (${pos.data.value})`)
          .transition()
          .duration(animate ? duration + 400 : 0)
          .style('opacity', 1)
      })
    }

    // Add center text if provided
    if (centerText) {
      const centerGroup = g.append('g').attr('class', 'center-text')

      // Primary text (larger)
      centerGroup
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', centerText.secondary ? '-0.2em' : '0.35em')
        .style('font-size', '18px')
        .style('font-weight', 'bold')
        .style('fill', '#111827')
        .text(centerText.primary)

      // Secondary text (smaller, below primary)
      if (centerText.secondary) {
        centerGroup
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '1.2em')
          .style('font-size', '12px')
          .style('font-weight', '500')
          .style('fill', '#6B7280')
          .text(centerText.secondary)
      }
    }

    // Add subtle hover effects for flat design
    paths
      .on('mouseover', function () {
        d3.select(this).transition().duration(150).attr('opacity', 0.85) // Subtle opacity change only
      })
      .on('mouseout', function () {
        d3.select(this).transition().duration(150).attr('opacity', 1)
      })
  }, [
    data,
    width,
    height,
    finalInnerRadius,
    finalOuterRadius,
    showLabels,
    showLeaderLines,
    centerText,
    animate,
    duration,
  ])

  return (
    <div ref={containerRef} className={`doughnut-chart ${className}`}>
      <svg ref={svgRef} width={width} height={height} style={{ overflow: 'visible' }} />

      {/* Legend */}
      {showLegend ? (
        <div className="mt-4 flex flex-wrap justify-center gap-4">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm text-gray-600">
                {item.label}: {item.value}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default DoughnutChart
