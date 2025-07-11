import * as React from "react"

function Button({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      className={`px-4 py-2 bg-blue-500 rounded-md hover:bg-blue-600 ${className || ''}`}
      {...props}
    />
  )
}

export { Button }
