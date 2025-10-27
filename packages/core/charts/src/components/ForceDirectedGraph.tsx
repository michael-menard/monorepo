import React, { useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'

export interface ForceDirectedNode {
  id: string
  title: string
  type: 'moc' | 'set'
  status: 'purchased' | 'wishlist'
  theme: string
  subtheme?: string
  partsCount?: number
  price?: number
  author?: string // For MOCs
  brand?: string // For Sets
  setNumber?: string
  // D3 simulation properties
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

export interface ForceDirectedLink {
  source: string
  target: string
  relationship: 'same-theme' | 'same-subtheme' | 'similar-parts' | 'same-author' | 'same-brand'
  strength: number // 0-1, affects link distance
}

export interface ForceDirectedGraphProps {
  nodes: ForceDirectedNode[]
  links?: ForceDirectedLink[]
  width?: number
  height?: number
  className?: string
  showLegend?: boolean
  enableZoom?: boolean
  enableDrag?: boolean
}

export const ForceDirectedGraph: React.FC<ForceDirectedGraphProps> = ({
  nodes,
  links = [],
  width = 800,
  height = 600,
  className = '',
  showLegend = true,
  enableZoom = true,
  enableDrag = true,
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedNode, setSelectedNode] = useState<ForceDirectedNode | null>(null)

  useEffect(() => {
    if (!svgRef.current || !nodes || nodes.length === 0) return

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove()

    // Create SVG
    const svg = d3.select(svgRef.current).attr('width', width).attr('height', height)

    // Create container group for zoom/pan
    const container = svg.append('g')

    // Color scales
    const statusColors = {
      purchased: '#10B981', // Green
      wishlist: '#F59E0B', // Amber
    }

    // Size function
    const getNodeSize = (d: ForceDirectedNode) => {
      // Size based on parts count, with reasonable bounds
      const baseSize = 8
      const maxSize = 20
      if (!d.partsCount) return baseSize
      return Math.min(maxSize, baseSize + d.partsCount / 200)
    }

    // Create force simulation
    const simulation = d3
      .forceSimulation(nodes as any)
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance((d: any) => 50 + (1 - d.strength) * 100)
          .strength((d: any) => d.strength * 0.5),
      )
      .force('charge', d3.forceManyBody().strength(-300).distanceMax(200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collision',
        d3.forceCollide().radius((d: any) => getNodeSize(d) + 2),
      )

    // Create links
    const link = container
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#64748b')
      .attr('stroke-opacity', 0.3)
      .attr('stroke-width', (d: any) => Math.sqrt(d.strength * 3))

    // Create nodes container
    const nodeGroup = container
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', enableDrag ? 'grab' : 'pointer')

    // Add shapes for nodes
    nodeGroup.each(function (d) {
      const node = d3.select(this)
      const size = getNodeSize(d)
      const color = statusColors[d.status]

      if (d.type === 'moc') {
        // Circle for MOCs
        node
          .append('circle')
          .attr('r', size)
          .attr('fill', color)
          .attr('stroke', '#1e293b')
          .attr('stroke-width', 2)
      } else {
        // Rectangle for Sets
        node
          .append('rect')
          .attr('width', size * 1.5)
          .attr('height', size * 1.5)
          .attr('x', -size * 0.75)
          .attr('y', -size * 0.75)
          .attr('fill', color)
          .attr('stroke', '#1e293b')
          .attr('stroke-width', 2)
      }
    })

    // Add labels
    nodeGroup
      .append('text')
      .text((d: ForceDirectedNode) =>
        d.title.length > 15 ? d.title.substring(0, 15) + '...' : d.title,
      )
      .attr('x', 0)
      .attr('y', (d: ForceDirectedNode) => getNodeSize(d) + 15)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('fill', '#e2e8f0')
      .style('font-weight', '500')

    // Add hover effects
    nodeGroup
      .on('mouseover', function (_event, d) {
        // Highlight node
        d3.select(this)
          .select('circle, rect')
          .transition()
          .duration(200)
          .attr('stroke-width', 4)
          .attr('stroke', '#99F6E4')

        // Show tooltip
        const tooltip = container
          .append('g')
          .attr('class', 'tooltip')
          .attr('transform', `translate(${d.x || 0}, ${(d.y || 0) - getNodeSize(d) - 30})`)

        const tooltipText = [
          `${d.title}`,
          `Type: ${d.type.toUpperCase()}`,
          `Status: ${d.status}`,
          `Theme: ${d.theme}`,
          d.subtheme ? `Subtheme: ${d.subtheme}` : '',
          d.partsCount ? `Parts: ${d.partsCount}` : '',
          d.author ? `Author: ${d.author}` : '',
          d.brand ? `Brand: ${d.brand}` : '',
        ].filter(Boolean)

        const textElement = tooltip
          .append('text')
          .attr('text-anchor', 'middle')
          .style('font-size', '12px')
          .style('fill', '#99F6E4')
          .style('font-weight', '500')

        tooltipText.forEach((text, i) => {
          textElement
            .append('tspan')
            .attr('x', 0)
            .attr('dy', i === 0 ? 0 : '1.2em')
            .text(text)
        })

        // Add background to tooltip
        const bbox = (textElement.node() as SVGTextElement).getBBox()
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
        // Remove highlight
        d3.select(this)
          .select('circle, rect')
          .transition()
          .duration(200)
          .attr('stroke-width', 2)
          .attr('stroke', '#1e293b')

        // Remove tooltip
        container.select('.tooltip').remove()
      })
      .on('click', function (_event, d) {
        setSelectedNode(d)
      })

    // Add drag behavior
    if (enableDrag) {
      const drag = d3
        .drag<any, ForceDirectedNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', (event, d) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.01) // Lower target so it settles faster
          d.fx = null
          d.fy = null
        })

      nodeGroup.call(drag)
    }

    // Add zoom behavior
    if (enableZoom) {
      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', event => {
          container.attr('transform', event.transform)
        })

      svg.call(zoom)
    }

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)

      nodeGroup.attr('transform', (d: any) => `translate(${d.x},${d.y})`)

      // Stop simulation when energy is low enough (nodes have settled)
      if (simulation.alpha() < 0.01) {
        simulation.stop()
      }
    })

    // Cleanup
    return () => {
      simulation.stop()
    }
  }, [nodes, links, width, height, enableZoom, enableDrag])

  return (
    <div className={`force-directed-graph ${className}`}>
      <div className="flex">
        <svg ref={svgRef} className="bg-slate-900 rounded-lg" />

        {showLegend ? (
          <div className="ml-6 space-y-4">
            {/* Shape Legend */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Type</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-muted-foreground rounded-full" />
                  <span className="text-sm text-foreground">MOCs</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-muted-foreground" />
                  <span className="text-sm text-foreground">Sets</span>
                </div>
              </div>
            </div>

            {/* Status Legend */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Status</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-green-500 rounded" />
                  <span className="text-sm text-foreground">Purchased</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-amber-500 rounded" />
                  <span className="text-sm text-foreground">Wishlist</span>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Controls</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• Drag nodes to reposition</div>
                <div>• Scroll to zoom in/out</div>
                <div>• Hover for details</div>
                <div>• Click to select</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {selectedNode ? (
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold text-foreground mb-2">Selected: {selectedNode.title}</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="font-medium">Type:</span> {selectedNode.type.toUpperCase()}
            </div>
            <div>
              <span className="font-medium">Status:</span> {selectedNode.status}
            </div>
            <div>
              <span className="font-medium">Theme:</span> {selectedNode.theme}
            </div>
            {selectedNode.subtheme ? (
              <div>
                <span className="font-medium">Subtheme:</span> {selectedNode.subtheme}
              </div>
            ) : null}
            {selectedNode.partsCount ? (
              <div>
                <span className="font-medium">Parts:</span> {selectedNode.partsCount}
              </div>
            ) : null}
            {selectedNode.author ? (
              <div>
                <span className="font-medium">Author:</span> {selectedNode.author}
              </div>
            ) : null}
            {selectedNode.brand ? (
              <div>
                <span className="font-medium">Brand:</span> {selectedNode.brand}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default ForceDirectedGraph
