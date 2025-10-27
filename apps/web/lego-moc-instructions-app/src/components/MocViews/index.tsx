import React from 'react'
import { motion } from 'framer-motion'
import { Calendar, User, Tag, Download, Star, Package } from 'lucide-react'

export interface MocData {
  id: string
  title: string
  description: string
  author: string
  category: string
  tags: string[]
  coverImageUrl?: string
  rating?: number
  downloadCount?: number
  createdAt: string
  updatedAt: string
}

interface MocViewsProps {
  instructions: MocData[]
  layout: 'grid' | 'list' | 'masonry' | 'table'
  onMocClick: (instruction: MocData) => void
}

// Color palette for MOC cards without cover images
const COLOR_PALETTE = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Purple-blue
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', // Pink-red
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', // Blue-cyan
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', // Green-teal
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', // Pink-yellow
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', // Teal-pink
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', // Coral-pink
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', // Peach-orange
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', // Purple-pink
  'linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)', // Peach-lavender
  'linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%)', // Yellow-coral
  'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)', // Light-dark blue
]

const getColorForTitle = (title: string): string => {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    const char = title.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  const index = Math.abs(hash) % COLOR_PALETTE.length
  return COLOR_PALETTE[index]
}

// Individual MOC Card Component
const MocCard: React.FC<{ instruction: MocData; onClick: () => void; className?: string }> = ({
  instruction,
  onClick,
  className = '',
}) => {
  const [isHovered, setIsHovered] = React.useState(false)
  const [imageError, setImageError] = React.useState(false)

  return (
    <motion.div
      className={`relative overflow-hidden rounded-lg cursor-pointer group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* Cover Image */}
      <div className="relative w-full aspect-square bg-gray-200">
        {instruction.coverImageUrl && !imageError ? (
          <img
            src={instruction.coverImageUrl}
            alt={instruction.title}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center p-4"
            style={{ background: getColorForTitle(instruction.title) }}
          >
            <div className="text-center">
              <h3 className="text-white font-bold text-lg md:text-xl lg:text-2xl leading-tight drop-shadow-lg text-center break-words">
                {instruction.title}
              </h3>
            </div>
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Bottom Drawer */}
      {isHovered ? (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
            duration: 0.3,
          }}
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900/95 via-gray-800/90 to-transparent backdrop-blur-sm"
        >
          <div className="p-4 pt-8">
            <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2">
              {instruction.title}
            </h3>

            {instruction.tags && instruction.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {instruction.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs font-medium rounded-full bg-white/20 text-white/90 backdrop-blur-sm"
                  >
                    {tag}
                  </span>
                ))}
                {instruction.tags.length > 3 && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-white/20 text-white/90 backdrop-blur-sm">
                    +{instruction.tags.length - 3}
                  </span>
                )}
              </div>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </motion.div>
  )
}

// Grid View Component
const GridView: React.FC<{
  instructions: MocData[]
  onMocClick: (instruction: MocData) => void
}> = ({ instructions, onMocClick }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
    {instructions.map((instruction, index) => (
      <motion.div
        key={instruction.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <MocCard instruction={instruction} onClick={() => onMocClick(instruction)} />
      </motion.div>
    ))}
  </div>
)

// List View Component
const ListView: React.FC<{
  instructions: MocData[]
  onMocClick: (instruction: MocData) => void
}> = ({ instructions, onMocClick }) => (
  <div className="space-y-3">
    {instructions.map((instruction, index) => (
      <motion.div
        key={instruction.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className="bg-card rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
        onClick={() => onMocClick(instruction)}
      >
        <div className="flex gap-4 p-4">
          {/* Thumbnail */}
          <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-muted">
            {instruction.coverImageUrl ? (
              <img
                src={instruction.coverImageUrl}
                alt={instruction.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-xs font-bold text-white text-center p-1"
                style={{ background: getColorForTitle(instruction.title) }}
              >
                {instruction.title.length > 10
                  ? instruction.title.substring(0, 8) + '...'
                  : instruction.title}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-foreground mb-1 truncate group-hover:text-primary transition-colors">
              {instruction.title}
            </h3>
            <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
              {instruction.description}
            </p>

            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{instruction.author}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{new Date(instruction.createdAt).toLocaleDateString()}</span>
              </div>
              {instruction.rating ? (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span>{instruction.rating}/5</span>
                </div>
              ) : null}
            </div>

            {instruction.tags && instruction.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {instruction.tags.slice(0, 4).map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-full"
                  >
                    {tag}
                  </span>
                ))}
                {instruction.tags.length > 4 && (
                  <span className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded-full">
                    +{instruction.tags.length - 4}
                  </span>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </motion.div>
    ))}
  </div>
)

// Masonry View Component
const MasonryView: React.FC<{
  instructions: MocData[]
  onMocClick: (instruction: MocData) => void
}> = ({ instructions, onMocClick }) => {
  // Create different sizes for masonry effect
  const getMasonryClass = (index: number) => {
    const patterns = [
      'col-span-1 row-span-1', // Normal
      'col-span-2 row-span-1', // Wide
      'col-span-1 row-span-2', // Tall
      'col-span-2 row-span-2', // Large
    ]

    // Create a pattern that ensures variety
    if (index % 7 === 0) return patterns[3] // Large every 7th
    if (index % 5 === 0) return patterns[2] // Tall every 5th
    if (index % 3 === 0) return patterns[1] // Wide every 3rd
    return patterns[0] // Normal for others
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 auto-rows-[200px]">
      {instructions.map((instruction, index) => (
        <motion.div
          key={instruction.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          className={getMasonryClass(index)}
        >
          <MocCard
            instruction={instruction}
            onClick={() => onMocClick(instruction)}
            className="h-full"
          />
        </motion.div>
      ))}
    </div>
  )
}

// Table View Component
const TableView: React.FC<{
  instructions: MocData[]
  onMocClick: (instruction: MocData) => void
}> = ({ instructions, onMocClick }) => (
  <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted/50 border-b border-border">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              MOC
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Author
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Category
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Rating
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Created
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tags
            </th>
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-border">
          {instructions.map((instruction, index) => (
            <motion.tr
              key={instruction.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className="hover:bg-muted cursor-pointer transition-colors duration-150"
              onClick={() => onMocClick(instruction)}
            >
              <td className="px-6 py-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-12 w-12 rounded-lg overflow-hidden bg-muted">
                    {instruction.coverImageUrl ? (
                      <img
                        src={instruction.coverImageUrl}
                        alt={instruction.title}
                        className="h-12 w-12 object-cover"
                      />
                    ) : (
                      <div
                        className="h-12 w-12 flex items-center justify-center text-xs font-bold text-white text-center p-1"
                        style={{ background: getColorForTitle(instruction.title) }}
                      >
                        {instruction.title.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="ml-4 min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground truncate max-w-xs">
                      {instruction.title}
                    </div>
                    <div className="text-sm text-muted-foreground truncate max-w-xs">
                      {instruction.description}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                {instruction.author}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                  {instruction.category}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                {instruction.rating ? (
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>{instruction.rating}/5</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                {new Date(instruction.createdAt).toLocaleDateString()}
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-1 max-w-xs">
                  {instruction.tags?.slice(0, 2).map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                  {instruction.tags && instruction.tags.length > 2 ? (
                    <span className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded-full">
                      +{instruction.tags.length - 2}
                    </span>
                  ) : null}
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

// Main MocViews Component
export const MocViews: React.FC<MocViewsProps> = ({ instructions, layout, onMocClick }) => {
  switch (layout) {
    case 'grid':
      return <GridView instructions={instructions} onMocClick={onMocClick} />
    case 'list':
      return <ListView instructions={instructions} onMocClick={onMocClick} />
    case 'masonry':
      return <MasonryView instructions={instructions} onMocClick={onMocClick} />
    case 'table':
      return <TableView instructions={instructions} onMocClick={onMocClick} />
    default:
      return <GridView instructions={instructions} onMocClick={onMocClick} />
  }
}

export default MocViews
