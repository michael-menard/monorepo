import React, { useEffect, useRef, useCallback, useState } from 'react'
import * as d3 from 'd3'

export interface SunburstNode {
  name: string
  value?: number
  color?: string
  children?: SunburstNode[]
}

export interface SunburstChartProps {
  data: SunburstNode
  width?: number
  height?: number
  className?: string
  animate?: boolean
  duration?: number
  /** Show breadcrumb trail on hover */
  showBreadcrumb?: boolean
}

interface HierarchyDatum {
  name: string
  value?: number
  color?: string
  children?: HierarchyDatum[]
}

export const SunburstChart: React.FC<SunburstChartProps> = ({
  data,
  width = 350,
  height = 350,
  className = '',
  animate = true,
  duration = 600,
  showBreadcrumb = true,
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [breadcrumb, setBreadcrumb] = useState<string | null>(null)
  const [hoverValue, setHoverValue] = useState<number | null>(null)

  const radius = Math.min(width, height) / 2

  const renderChart = useCallback(() => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Build hierarchy
    const root = d3
      .hierarchy<HierarchyDatum>(data)
      .sum(d => d.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

    // Create partition layout
    const partition = d3.partition<HierarchyDatum>().size([2 * Math.PI, radius])

    const partitioned = partition(root)

    // Skip rendering if no data
    if (!partitioned.value) return

    // Arc generator — inner ring starts at ~30% radius, leaves a center hole
    const arc = d3
      .arc<d3.HierarchyRectangularNode<HierarchyDatum>>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(0.008)
      .padRadius(radius / 2)
      .innerRadius(d => Math.max(d.y0 * 0.85, d.depth === 1 ? radius * 0.22 : d.y0 * 0.85))
      .outerRadius(d => d.y1 * 0.85 - 1)

    // Color scale for themes (level 1)
    const themeColors = [
      '#0ea5e9', // sky-500
      '#14b8a6', // teal-500
      '#f59e0b', // amber-500
      '#ef4444', // red-500
      '#8b5cf6', // violet-500
      '#ec4899', // pink-500
      '#22c55e', // green-500
      '#f97316', // orange-500
      '#06b6d4', // cyan-500
      '#a855f7', // purple-500
      '#6366f1', // indigo-500
      '#84cc16', // lime-500
    ]

    // Category colors (level 2) — lighter variations per parent
    const categoryOpacity: Record<string, number> = {
      Instructions: 1.0,
      Sets: 0.65,
      Minifigs: 0.4,
    }

    const getColor = (d: d3.HierarchyRectangularNode<HierarchyDatum>): string => {
      if (d.depth === 0) return 'transparent' // root hidden
      if (d.depth === 1) {
        // Theme ring — assign color by index among siblings
        const siblings = (d.parent?.children ?? []).filter(c => (c.value ?? 0) > 0)
        const idx = siblings.indexOf(d)
        return d.data.color ?? themeColors[idx % themeColors.length]
      }
      // Category ring — derive from parent color with opacity variation
      const parentColor = getColor(d.parent!)
      const opacity = categoryOpacity[d.data.name] ?? 0.7
      const base = d3.color(parentColor)
      if (base) {
        // Blend with white to lighten for lower opacity categories
        const rgb = base.rgb()
        const factor = opacity
        return `rgb(${Math.round(rgb.r * factor + 255 * (1 - factor))}, ${Math.round(rgb.g * factor + 255 * (1 - factor))}, ${Math.round(rgb.b * factor + 255 * (1 - factor))})`
      }
      return parentColor
    }

    const g = svg.append('g').attr('transform', `translate(${width / 2}, ${height / 2})`)

    // Draw arcs — skip root node (depth 0)
    const paths = g
      .selectAll('path')
      .data(partitioned.descendants().filter(d => d.depth > 0 && (d.value ?? 0) > 0))
      .enter()
      .append('path')
      .attr('fill', d => getColor(d))
      .attr('stroke', 'none')
      .style('cursor', 'pointer')
      .style('shape-rendering', 'geometricPrecision')

    if (animate) {
      paths
        .attr('d', d => {
          // Start with zero-width arc
          const clone = { ...d, x1: d.x0 }
          return arc(clone as d3.HierarchyRectangularNode<HierarchyDatum>) ?? ''
        })
        .transition()
        .duration(duration)
        .attrTween('d', function (d) {
          const interpolate = d3.interpolate({ x0: d.x0, x1: d.x0 }, { x0: d.x0, x1: d.x1 })
          return function (t) {
            const interp = interpolate(t)
            const clone = { ...d, x0: interp.x0, x1: interp.x1 }
            return arc(clone as d3.HierarchyRectangularNode<HierarchyDatum>) ?? ''
          }
        })
    } else {
      paths.attr('d', arc)
    }

    // Hover interactions
    paths
      .on('mouseover', function (_event, d) {
        d3.select(this).transition().duration(100).attr('opacity', 0.8)

        // Build breadcrumb trail
        const trail = d
          .ancestors()
          .reverse()
          .filter(a => a.depth > 0)
          .map(a => a.data.name)
        setBreadcrumb(trail.join(' → '))
        setHoverValue(d.value ?? null)
      })
      .on('mouseout', function () {
        d3.select(this).transition().duration(100).attr('opacity', 1)
        setBreadcrumb(null)
        setHoverValue(null)
      })

    // External labels with leader lines for theme ring (depth 1)
    const themeNodes = partitioned.descendants().filter(d => d.depth === 1 && (d.value ?? 0) > 0)
    const outerEdge = radius * 0.85 // matches outerRadius of deepest ring
    const lineStartR = outerEdge + 2
    const lineBendR = outerEdge + 14
    const labelR = outerEdge + 18
    const horizontalLen = 20
    const minLabelSpacing = 14

    // Build label positions
    const labelPositions = themeNodes.map(d => {
      const midAngle = (d.x0 + d.x1) / 2 - Math.PI / 2
      const startX = Math.cos(midAngle) * lineStartR
      const startY = Math.sin(midAngle) * lineStartR
      const bendX = Math.cos(midAngle) * lineBendR
      const bendY = Math.sin(midAngle) * lineBendR
      const labelX = Math.cos(midAngle) * labelR
      const labelY = Math.sin(midAngle) * labelR
      const isRight = labelX > 0
      const endX = labelX + (isRight ? horizontalLen : -horizontalLen)
      return { data: d, startX, startY, bendX, bendY, labelX, labelY: labelY, endX, isRight }
    })

    // Collision avoidance — separate left/right, sort by Y, push apart
    const adjustSide = (labels: typeof labelPositions) => {
      labels.sort((a, b) => a.labelY - b.labelY)
      for (let i = 1; i < labels.length; i++) {
        if (labels[i].labelY - labels[i - 1].labelY < minLabelSpacing) {
          labels[i].labelY = labels[i - 1].labelY + minLabelSpacing
        }
      }
    }
    const leftLabels = labelPositions.filter(l => !l.isRight)
    const rightLabels = labelPositions.filter(l => l.isRight)
    adjustSide(leftLabels)
    adjustSide(rightLabels)

    const allLabels = [...leftLabels, ...rightLabels]

    // Draw leader lines
    allLabels.forEach(pos => {
      g.append('path')
        .attr('class', 'leader-line')
        .attr(
          'd',
          `M ${pos.startX} ${pos.startY} L ${pos.bendX} ${pos.bendY} L ${pos.endX} ${pos.labelY}`,
        )
        .attr('stroke', 'var(--color-muted-foreground, #6B7280)')
        .attr('stroke-width', 1)
        .attr('fill', 'none')
        .style('opacity', 0)
        .transition()
        .duration(animate ? duration + 200 : 0)
        .style('opacity', 0.6)

      g.append('text')
        .attr('class', 'leader-label')
        .attr('x', pos.endX + (pos.isRight ? 5 : -5))
        .attr('y', pos.labelY)
        .attr('text-anchor', pos.isRight ? 'start' : 'end')
        .attr('dominant-baseline', 'middle')
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', 'var(--color-card-foreground, #e2e8f0)')
        .style('pointer-events', 'none')
        .style('opacity', 0)
        .text(`${pos.data.data.name} (${pos.data.value})`)
        .transition()
        .duration(animate ? duration + 400 : 0)
        .style('opacity', 1)
    })

    // Center text — total count
    const centerGroup = g.append('g').attr('class', 'center-text')

    centerGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.15em')
      .style('font-size', '22px')
      .style('font-weight', 'bold')
      .style('fill', 'var(--color-card-foreground, #1e293b)')
      .text(partitioned.value ?? 0)

    centerGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.2em')
      .style('font-size', '11px')
      .style('font-weight', '500')
      .style('fill', 'var(--color-muted-foreground, #94a3b8)')
      .text('Total Items')
  }, [data, width, height, radius, animate, duration])

  useEffect(() => {
    renderChart()
  }, [renderChart])

  return (
    <div className={`sunburst-chart relative ${className}`}>
      <svg ref={svgRef} width={width} height={height} style={{ overflow: 'visible' }} />

      {/* Breadcrumb tooltip */}
      {showBreadcrumb && breadcrumb ? (
        <div className="absolute bottom-0 left-0 right-0 text-center text-xs text-muted-foreground py-1">
          <span className="font-medium">{breadcrumb}</span>
          {hoverValue != null ? (
            <span className="ml-1 text-foreground font-semibold">({hoverValue})</span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default SunburstChart
