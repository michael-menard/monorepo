import { useState, useEffect } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

// Simple theme hook for React apps
const useTheme = () => {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system")

  useEffect(() => {
    // Check for system preference
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => {
      setTheme(mediaQuery.matches ? "dark" : "light")
    }
    
    mediaQuery.addEventListener("change", handleChange)
    handleChange() // Set initial theme
    
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  return { theme }
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
