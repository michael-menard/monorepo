/**
 * Customs Recommender Page
 *
 * AI-powered character concept → part recommendations.
 * Users type a concept (e.g. "fire mage"), get ranked part suggestions
 * grouped by source, and can save selections as build projects.
 */

import { useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  cn,
} from '@repo/app-component-library'
import { Sparkles, Search, Save, Trash2, Package, User, Globe, Heart, Loader2 } from 'lucide-react'
import {
  useExpandConceptMutation,
  useSearchPartsMutation,
  useExplainPartsMutation,
  useCreateBuildProjectMutation,
  useGetBuildProjectsQuery,
  useDeleteBuildProjectMutation,
} from '@repo/api-client/rtk/recommender-api'
import type {
  ScoredPart,
  SearchResult,
  ConceptSignals,
  PartExplanation,
} from '@repo/api-client/rtk/recommender-api'

// ─────────────────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────────────────

export function CustomsPage() {
  const [concept, setConcept] = useState('')
  const [signals, setSignals] = useState<ConceptSignals | null>(null)
  const [results, setResults] = useState<SearchResult | null>(null)
  const [explanations, setExplanations] = useState<Map<string, string>>(new Map())
  const [selectedParts, setSelectedParts] = useState<Set<string>>(new Set())
  const [projectName, setProjectName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  const [expandConcept, { isLoading: isExpanding }] = useExpandConceptMutation()
  const [searchParts, { isLoading: isSearching }] = useSearchPartsMutation()
  const [explainParts, { isLoading: isExplaining }] = useExplainPartsMutation()
  const [createProject, { isLoading: isSaving }] = useCreateBuildProjectMutation()
  const [deleteProject] = useDeleteBuildProjectMutation()
  const { data: projects } = useGetBuildProjectsQuery()

  const isLoading = isExpanding || isSearching

  // ─────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────

  async function handleSearch() {
    if (!concept.trim()) return

    try {
      // Step 1: Expand concept into signals
      const expandResult = await expandConcept({ concept: concept.trim() }).unwrap()
      setSignals(expandResult)

      // Step 2: Search parts using signals
      const searchResult = await searchParts({ signals: expandResult, limit: 20 }).unwrap()
      setResults(searchResult)
      setSelectedParts(new Set())
      setExplanations(new Map())

      // Step 3: Generate explanations for top results
      const allParts = [
        ...searchResult.collection.slice(0, 5),
        ...searchResult.wishlist.slice(0, 5),
        ...searchResult.external.slice(0, 5),
      ]

      if (allParts.length > 0) {
        const explainResult = await explainParts({
          concept: concept.trim(),
          parts: allParts.map(p => ({
            partNumber: p.partNumber,
            partName: p.partName,
            color: p.color,
            category: p.category,
            source: p.source,
            matchReasons: p.matchReasons,
          })),
        }).unwrap()

        const explanationMap = new Map<string, string>()
        explainResult.forEach(e => {
          explanationMap.set(`${e.partNumber}:${e.color}`, e.explanation)
        })
        setExplanations(explanationMap)
      }
    } catch (_error) {
      // Errors are handled by RTK Query's error state
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !isLoading) {
      handleSearch()
    }
  }

  function togglePart(partNumber: string, color: string) {
    const key = `${partNumber}:${color}`
    setSelectedParts(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  async function handleSaveProject() {
    if (!projectName.trim() || !results) return

    const allParts = [...results.collection, ...results.wishlist, ...results.external]
    const partsToSave = allParts.filter(p => selectedParts.has(`${p.partNumber}:${p.color}`))

    try {
      await createProject({
        name: projectName.trim(),
        concept: concept.trim(),
        searchSignals: signals ?? undefined,
        parts: partsToSave.map(p => ({
          partNumber: p.partNumber,
          color: p.color,
          quantity: 1,
          source: p.source,
          explanation: explanations.get(`${p.partNumber}:${p.color}`),
        })),
      }).unwrap()

      setShowSaveDialog(false)
      setProjectName('')
      setSelectedParts(new Set())
    } catch (_error) {
      // RTK Query handles errors
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Sparkles className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Custom Minifig Builder</h1>
          <p className="text-sm text-muted-foreground">
            Describe a character concept and get part recommendations from your collection
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <Input
          placeholder='Try "fire mage", "forest ranger", "city mechanic"...'
          value={concept}
          onChange={e => setConcept(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className="flex-1"
        />
        <Button onClick={handleSearch} disabled={isLoading || !concept.trim()}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          <span className="ml-2">{isLoading ? 'Searching...' : 'Search'}</span>
        </Button>
      </div>

      {/* Signals Preview */}
      {signals && (
        <div className="flex flex-wrap gap-2">
          {signals.colors.map(c => (
            <Badge key={`color-${c}`} variant="outline" className="text-xs">
              {c}
            </Badge>
          ))}
          {signals.categories.map(c => (
            <Badge key={`cat-${c}`} variant="secondary" className="text-xs">
              {c}
            </Badge>
          ))}
          {signals.relatedThemes.map(t => (
            <Badge key={`theme-${t}`} className="text-xs">
              {t}
            </Badge>
          ))}
        </div>
      )}

      {/* Results */}
      {results && (
        <>
          {/* Summary */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Found {results.totalResults} matching parts
            </p>
            {selectedParts.size > 0 && (
              <Button onClick={() => setShowSaveDialog(true)} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save {selectedParts.size} parts as project
              </Button>
            )}
          </div>

          {/* Results Grid — three source groups */}
          <div className="grid gap-4 lg:grid-cols-3">
            <PartGroup
              title="From Your Collection"
              icon={<Package className="h-4 w-4" />}
              parts={results.collection}
              explanations={explanations}
              selectedParts={selectedParts}
              onToggle={togglePart}
              emptyMessage="No matching parts in your collection"
            />
            <PartGroup
              title="From Your Wishlist"
              icon={<Heart className="h-4 w-4" />}
              parts={results.wishlist}
              explanations={explanations}
              selectedParts={selectedParts}
              onToggle={togglePart}
              emptyMessage="No matching parts on your wishlist"
            />
            <PartGroup
              title="From the Web"
              icon={<Globe className="h-4 w-4" />}
              parts={results.external}
              explanations={explanations}
              selectedParts={selectedParts}
              onToggle={togglePart}
              emptyMessage="No external matches found"
            />
          </div>

          {/* Donor Minifigs */}
          {results.donorMinifigs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Related Figures
                </CardTitle>
                <CardDescription>Minifigs whose parts match this concept</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {results.donorMinifigs.map(donor => (
                    <div
                      key={donor.variantId}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      {donor.imageUrl ? (
                        <img
                          src={donor.imageUrl}
                          alt={donor.name}
                          className="h-12 w-12 rounded object-contain"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                          <User className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{donor.name}</p>
                        {donor.theme && (
                          <p className="text-xs text-muted-foreground">{donor.theme}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{donor.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Empty State */}
      {!results && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h2 className="text-lg font-medium text-muted-foreground">Describe your character</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Type a character concept above and the AI will find matching parts from your collection,
            wishlist, and the wider LEGO ecosystem.
          </p>
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Save Build Project</CardTitle>
              <CardDescription>
                Save {selectedParts.size} selected parts for &ldquo;{concept}&rdquo;
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input
                placeholder="Project name (e.g. Fire Mage v1)"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && projectName.trim()) handleSaveProject()
                }}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveProject} disabled={!projectName.trim() || isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Project
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Saved Projects */}
      {projects && projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Saved Build Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {projects.map(project => (
                <div
                  key={project.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{project.name}</p>
                    <p className="text-xs text-muted-foreground">Concept: {project.concept}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteProject(project.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Part Group Component
// ─────────────────────────────────────────────────────────────────────────

function PartGroup({
  title,
  icon,
  parts,
  explanations,
  selectedParts,
  onToggle,
  emptyMessage,
}: {
  title: string
  icon: React.ReactNode
  parts: ScoredPart[]
  explanations: Map<string, string>
  selectedParts: Set<string>
  onToggle: (partNumber: string, color: string) => void
  emptyMessage: string
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {icon}
          {title}
          <Badge variant="secondary" className="ml-auto text-xs">
            {parts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {parts.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">{emptyMessage}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {parts.map(part => {
              const key = `${part.partNumber}:${part.color}`
              const isSelected = selectedParts.has(key)
              const explanation = explanations.get(key)

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onToggle(part.partNumber, part.color)}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'hover:bg-muted/50',
                  )}
                >
                  {part.imageUrl ? (
                    <img
                      src={part.imageUrl}
                      alt={part.partName}
                      className="h-10 w-10 rounded object-contain flex-shrink-0"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-muted flex-shrink-0">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{part.partName}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        {part.color}
                      </Badge>
                      {part.category && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                          {part.category}
                        </Badge>
                      )}
                    </div>
                    {explanation && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {explanation}
                      </p>
                    )}
                    {!explanation && part.matchReasons.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {part.matchReasons.join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex-shrink-0">
                    {Math.round(part.score * 100)}%
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
