import React from 'react'
import { RouterProvider } from '@tanstack/react-router'

import { ThemeProvider } from '@repo/app-component-library'
import { router } from './routes'

import { Module } from './Module'

export function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="instuctions-gallery-theme">
      <Module />
    </ThemeProvider>
  )
}
