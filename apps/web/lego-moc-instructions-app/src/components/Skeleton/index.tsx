import React from 'react'

interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  variant?: 'text' | 'rectangular' | 'circular'
  animation?: 'pulse' | 'wave' | 'none'
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  variant = 'rectangular',
  animation = 'pulse'
}) => {
  const baseClasses = 'bg-gray-200 rounded'
  
  const variantClasses = {
    text: 'h-4 rounded-md',
    rectangular: 'rounded-md',
    circular: 'rounded-full'
  }
  
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200',
    none: ''
  }
  
  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height
  
  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
      role="presentation"
      aria-hidden="true"
    />
  )
}

// Gallery Grid Skeleton
export const GalleryGridSkeleton: React.FC<{ count?: number }> = ({ count = 12 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Image skeleton */}
          <Skeleton height={200} className="w-full" animation="wave" />
          
          {/* Content skeleton */}
          <div className="p-4 space-y-3">
            {/* Title */}
            <Skeleton height={20} width="80%" />
            
            {/* Description lines */}
            <div className="space-y-2">
              <Skeleton height={16} width="100%" />
              <Skeleton height={16} width="60%" />
            </div>
            
            {/* Tags */}
            <div className="flex gap-2 pt-2">
              <Skeleton height={24} width={60} className="rounded-full" />
              <Skeleton height={24} width={80} className="rounded-full" />
              <Skeleton height={24} width={50} className="rounded-full" />
            </div>
            
            {/* Author and date */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Skeleton variant="circular" width={24} height={24} />
                <Skeleton height={16} width={80} />
              </div>
              <Skeleton height={14} width={60} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Detail Page Skeleton
export const DetailPageSkeleton: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header skeleton */}
      <div className="mb-8">
        <Skeleton height={36} width="60%" className="mb-4" />
        <div className="flex items-center gap-4 mb-4">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="space-y-2">
            <Skeleton height={16} width={120} />
            <Skeleton height={14} width={100} />
          </div>
        </div>
        
        {/* Tags skeleton */}
        <div className="flex gap-2 mb-6">
          <Skeleton height={28} width={60} className="rounded-full" />
          <Skeleton height={28} width={80} className="rounded-full" />
          <Skeleton height={28} width={70} className="rounded-full" />
        </div>
      </div>
      
      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cover image */}
          <Skeleton height={400} className="w-full rounded-lg" animation="wave" />
          
          {/* Description */}
          <div className="space-y-4">
            <Skeleton height={24} width="40%" />
            <div className="space-y-2">
              <Skeleton height={16} width="100%" />
              <Skeleton height={16} width="100%" />
              <Skeleton height={16} width="80%" />
              <Skeleton height={16} width="90%" />
            </div>
          </div>
          
          {/* Instructions steps */}
          <div className="space-y-4">
            <Skeleton height={24} width="30%" />
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <Skeleton height={20} width="25%" />
                <Skeleton height={200} className="w-full rounded" animation="wave" />
                <div className="space-y-2">
                  <Skeleton height={16} width="100%" />
                  <Skeleton height={16} width="75%" />
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats card */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <Skeleton height={20} width="50%" />
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center space-y-2">
                <Skeleton height={24} width="60%" className="mx-auto" />
                <Skeleton height={14} width="40%" className="mx-auto" />
              </div>
              <div className="text-center space-y-2">
                <Skeleton height={24} width="60%" className="mx-auto" />
                <Skeleton height={14} width="40%" className="mx-auto" />
              </div>
            </div>
          </div>
          
          {/* Actions card */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <Skeleton height={40} className="w-full" />
            <Skeleton height={40} className="w-full" />
            <Skeleton height={40} className="w-full" />
          </div>
          
          {/* Related items */}
          <div className="space-y-4">
            <Skeleton height={20} width="60%" />
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-4 space-y-3">
                <Skeleton height={120} className="w-full rounded" animation="wave" />
                <Skeleton height={16} width="80%" />
                <Skeleton height={14} width="60%" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Search and Filter Skeleton
export const SearchFilterSkeleton: React.FC = () => {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Skeleton height={40} width="100%" className="sm:max-w-md" />
        <div className="flex gap-2">
          <Skeleton height={36} width={80} />
          <Skeleton height={36} width={60} />
        </div>
      </div>
      <Skeleton height={14} width={150} />
    </div>
  )
}
