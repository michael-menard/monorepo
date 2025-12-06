import React from 'react'
import { ThemeProvider } from '@repo/app-component-library'
import { Module } from './Module'

export function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="app-sets-gallery-theme">
      <Module />
    </ThemeProvider>
  )
}
