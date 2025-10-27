import React, { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import * as d3 from 'd3'

export interface ScatterPlot3DDataPoint {
  x: number
  y: number
  z: number
  category: string
  layer: string
  label?: string
  [key: string]: any
}

export interface ScatterPlot3DProps {
  data: ScatterPlot3DDataPoint[]
  width?: number
  height?: number
  xLabel?: string
  yLabel?: string
  zLabel?: string
  colors?: string[]
  animate?: boolean
  className?: string
}

export const ScatterPlot3D: React.FC<ScatterPlot3DProps> = ({
  data,
  width = 800,
  height = 600,
  colors = [
    '#3B82F6',
    '#8B5CF6',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#6366F1',
    '#EC4899',
    '#14B8A6',
    '#F97316',
    '#84CC16',
  ],
  animate = true,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene>()
  const rendererRef = useRef<THREE.WebGLRenderer>()
  const cameraRef = useRef<THREE.PerspectiveCamera>()
  const frameRef = useRef<number>()

  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set())
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(new Set())

  // Initialize visible sets
  useEffect(() => {
    if (data && data.length > 0) {
      const categories = [...new Set(data.map(d => d.category))]
      const layers = [...new Set(data.map(d => d.layer))]

      setVisibleCategories(new Set(categories))
      setVisibleLayers(new Set(layers))
    }
  }, [data])

  useEffect(() => {
    if (!mountRef.current || !data || data.length === 0) return

    // Scene setup with dark theme background
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0f172a) // Dark slate background to match app theme
    sceneRef.current = scene

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    camera.position.set(50, 50, 50)
    cameraRef.current = camera

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    rendererRef.current = renderer

    // Clear previous content and add renderer
    mountRef.current.innerHTML = ''
    mountRef.current.appendChild(renderer.domElement)

    // Add OrbitControls (you'll need to install three/examples/jsm/controls/OrbitControls)
    // For now, we'll implement basic mouse controls
    let mouseX = 0,
      mouseY = 0
    let isMouseDown = false

    const onMouseMove = (event: MouseEvent) => {
      if (!isMouseDown) return

      const deltaX = event.clientX - mouseX
      const deltaY = event.clientY - mouseY

      camera.position.x =
        camera.position.x * Math.cos(deltaX * 0.01) - camera.position.z * Math.sin(deltaX * 0.01)
      camera.position.z =
        camera.position.x * Math.sin(deltaX * 0.01) + camera.position.z * Math.cos(deltaX * 0.01)
      camera.position.y += deltaY * 0.1

      camera.lookAt(0, 0, 0)

      mouseX = event.clientX
      mouseY = event.clientY
    }

    const onMouseDown = (event: MouseEvent) => {
      isMouseDown = true
      mouseX = event.clientX
      mouseY = event.clientY
    }

    const onMouseUp = () => {
      isMouseDown = false
    }

    renderer.domElement.addEventListener('mousemove', onMouseMove)
    renderer.domElement.addEventListener('mousedown', onMouseDown)
    renderer.domElement.addEventListener('mouseup', onMouseUp)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(50, 50, 50)
    directionalLight.castShadow = true
    scene.add(directionalLight)

    // Create scales
    const categories = [...new Set(data.map(d => d.category))]
    const colorScale = d3.scaleOrdinal<string>().domain(categories).range(colors)

    // Get data extents
    const xExtent = d3.extent(data, d => d.x) as [number, number]
    const yExtent = d3.extent(data, d => d.y) as [number, number]
    const zExtent = d3.extent(data, d => d.z) as [number, number]

    // Create scales for 3D positioning
    const xScale = d3.scaleLinear().domain(xExtent).range([-20, 20])
    const yScale = d3.scaleLinear().domain(yExtent).range([-15, 15])
    const zScale = d3.scaleLinear().domain(zExtent).range([-20, 20])

    // Create axes with better visibility for dark theme
    const createAxis = (start: THREE.Vector3, end: THREE.Vector3, color: number = 0x64748b) => {
      const geometry = new THREE.BufferGeometry().setFromPoints([start, end])
      const material = new THREE.LineBasicMaterial({ color })
      return new THREE.Line(geometry, material)
    }

    // Add axes with lighter color for dark background
    scene.add(createAxis(new THREE.Vector3(-25, -20, 0), new THREE.Vector3(25, -20, 0), 0x64748b)) // X axis
    scene.add(createAxis(new THREE.Vector3(-25, -20, 0), new THREE.Vector3(-25, 20, 0), 0x64748b)) // Y axis
    scene.add(createAxis(new THREE.Vector3(-25, -20, 0), new THREE.Vector3(-25, -20, 25), 0x64748b)) // Z axis

    // Filter data based on visibility
    const filteredData = data.filter(d => {
      return visibleLayers.has(d.layer) && visibleCategories.has(d.category)
    })

    // Create data points
    const pointsGroup = new THREE.Group()
    scene.add(pointsGroup)

    filteredData.forEach((point, index) => {
      // Use spheres for all points - simple and clean
      const geometry = new THREE.SphereGeometry(0.8, 16, 16)

      // Create material with category color
      const material = new THREE.MeshLambertMaterial({
        color: new THREE.Color(colorScale(point.category)),
        transparent: true,
        opacity: 0.8,
      })

      // Create mesh
      const mesh = new THREE.Mesh(geometry, material)

      // Position the mesh
      mesh.position.set(xScale(point.x), yScale(point.y), zScale(point.z))

      // Add to group
      pointsGroup.add(mesh)

      // Animate if enabled
      if (animate) {
        mesh.scale.set(0, 0, 0)

        // Animate scale up with delay
        const animateScale = () => {
          const targetScale = 1
          const currentScale = mesh.scale.x
          const newScale = currentScale + (targetScale - currentScale) * 0.1

          mesh.scale.set(newScale, newScale, newScale)

          if (Math.abs(targetScale - newScale) > 0.01) {
            requestAnimationFrame(animateScale)
          }
        }

        setTimeout(() => animateScale(), index * 100)
      }
    })

    // Animation loop
    const animate3D = () => {
      frameRef.current = requestAnimationFrame(animate3D)

      // No auto-rotation - only render when needed
      camera.lookAt(0, 0, 0)
      renderer.render(scene, camera)
    }

    animate3D()

    // Cleanup
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }

      renderer.domElement.removeEventListener('mousemove', onMouseMove)
      renderer.domElement.removeEventListener('mousedown', onMouseDown)
      renderer.domElement.removeEventListener('mouseup', onMouseUp)

      // Dispose of Three.js objects
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          if (object.material instanceof THREE.Material) {
            object.material.dispose()
          }
        }
      })

      renderer.dispose()
    }
  }, [data, width, height, colors, animate, visibleLayers, visibleCategories])

  // Toggle functions
  const toggleLayer = (layer: string) => {
    const newVisibleLayers = new Set(visibleLayers)
    if (newVisibleLayers.has(layer)) {
      newVisibleLayers.delete(layer)
    } else {
      newVisibleLayers.add(layer)
    }
    setVisibleLayers(newVisibleLayers)
  }

  const toggleCategory = (category: string) => {
    const newVisibleCategories = new Set(visibleCategories)
    if (newVisibleCategories.has(category)) {
      newVisibleCategories.delete(category)
    } else {
      newVisibleCategories.add(category)
    }
    setVisibleCategories(newVisibleCategories)
  }

  // Get unique values for legend
  const layers = [...new Set(data.map(d => d.layer))]
  const categories = [...new Set(data.map(d => d.category))]
  const colorScale = d3.scaleOrdinal<string>().domain(categories).range(colors)

  return (
    <div className={`scatter-plot-3d ${className}`}>
      <div className="flex">
        <div ref={mountRef} style={{ width, height }} className="rounded-lg overflow-hidden" />

        {/* 3D Legend - styled to match app theme */}
        <div className="ml-6 space-y-6">
          {/* Layer Controls */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Layers</h4>
            {layers.map(layer => (
              <div
                key={layer}
                className={`flex items-center space-x-3 cursor-pointer mb-2 p-2 rounded-md transition-all hover:bg-muted/50 ${
                  visibleLayers.has(layer) ? 'opacity-100' : 'opacity-40'
                }`}
                onClick={() => toggleLayer(layer)}
              >
                <div className="w-3 h-3 bg-muted-foreground rounded-full" />
                <span className="text-sm text-foreground font-medium">{layer}</span>
              </div>
            ))}
          </div>

          {/* Category Controls */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Categories</h4>
            {categories.map(category => (
              <div
                key={category}
                className={`flex items-center space-x-3 cursor-pointer mb-2 p-2 rounded-md transition-all hover:bg-muted/50 ${
                  visibleCategories.has(category) ? 'opacity-100' : 'opacity-40'
                }`}
                onClick={() => toggleCategory(category)}
              >
                <div
                  className="w-3 h-3 rounded-full border border-border"
                  style={{ backgroundColor: colorScale(category) }}
                />
                <span className="text-sm text-foreground">{category}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ScatterPlot3D
