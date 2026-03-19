import { type SVGProps } from 'react'

export type ThrashIconProps = SVGProps<SVGSVGElement> & {
  /** Icon size in pixels (applies to both width and height) */
  size?: number
}

/**
 * Tornado/storm icon indicating a story has thrashed between statuses.
 * Designed to match lucide-react icon conventions (24×24 viewBox, stroke-based).
 */
export function ThrashIcon({ size = 24, className, ...props }: ThrashIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Cloud top */}
      <path d="M8 6a4 4 0 0 1 7.8-1A3 3 0 0 1 19 8a3 3 0 0 1-3 3H7a3 3 0 0 1-.1-6h.3" />
      {/* Funnel / tornado body — three progressively narrower sweeping arcs */}
      <path d="M8 11c3 1 7 1 10 0" />
      <path d="M9 14c2.5.8 5.5.8 7 0" />
      <path d="M10.5 17c1.5.5 3.5.5 4.5 0" />
      {/* Narrow tail whip */}
      <path d="M12 19c.8.3 1.8 0 2.2-.5" />
    </svg>
  )
}
