import { useParams, useLocation, Link } from '@tanstack/react-router'
import {
  CustomButton,
  Textarea,
  AppTabs,
  AppTabsList,
  AppTabsTrigger,
  AppTabsContent,
  ConfirmationDialog,
} from '@repo/app-component-library'
import { ArrowLeft, AlertTriangle, Pencil, Check, X, Ban } from 'lucide-react'
import { useState } from 'react'
import {
  useGetStoryByIdQuery,
  useUpdateStoryMutation,
  useUpdateStoryContentSectionMutation,
} from '../../store/roadmapApi'
import { useStorySSE } from '../../hooks/useStorySSE'
import { PipelineStrip } from '../../components/story-details/PipelineStrip'
import { SectionContent } from '../../components/story-details/SectionContent'
import { ArtifactJsonViewer } from '../../components/story-details/ArtifactJsonViewer'
import { StoryHeader } from '../../components/story-details/StoryHeader'
import { DependenciesCard } from '../../components/story-details/DependenciesCard'
import { OutcomeCard } from '../../components/story-details/OutcomeCard'
import { ActivityTimeline } from '../../components/story-details/ActivityTimeline'
import { StorySidebar } from '../../components/story-details/StorySidebar'
import { ReviewTab } from '../../components/story-details/ReviewTab'
import { VerificationTab } from '../../components/story-details/VerificationTab'
import { DetailCard } from '../../components/shared/DetailCard'

export function StoryDetailsPage() {
  const { storyId } = useParams({ from: '/story/$storyId' })
  const location = useLocation()
  const fromPlan = (location.state as { fromPlan?: { slug: string; title: string } })?.fromPlan
  const { data, error, isLoading } = useGetStoryByIdQuery(storyId, { pollingInterval: 30_000 })
  useStorySSE()
  const [updateStory] = useUpdateStoryMutation()
  const [updateSection] = useUpdateStoryContentSectionMutation()
  const [editingDescription, setEditingDescription] = useState(false)
  const [descriptionValue, setDescriptionValue] = useState('')
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [sectionValue, setSectionValue] = useState('')
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const handleCancelStory = async () => {
    setCancelling(true)
    try {
      await updateStory({ storyId, input: { state: 'cancelled' } }).unwrap()
      setShowCancelDialog(false)
    } catch {
      // keep dialog open on error
    } finally {
      setCancelling(false)
    }
  }

  const handleDescriptionSave = async () => {
    try {
      await updateStory({ storyId, input: { description: descriptionValue } }).unwrap()
      setEditingDescription(false)
    } catch {
      // keep editing open on error
    }
  }

  const handleSectionSave = async (sectionName: string) => {
    try {
      await updateSection({ storyId, sectionName, contentText: sectionValue }).unwrap()
      setEditingSection(null)
    } catch {
      // keep editing open on error
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="animate-pulse space-y-6">
          <div className="h-5 bg-slate-800 rounded w-32" />
          <div className="space-y-3">
            <div className="h-4 bg-slate-800 rounded w-24" />
            <div className="h-8 bg-slate-800 rounded w-2/3" />
            <div className="flex gap-2">
              <div className="h-5 bg-slate-800 rounded-full w-20" />
              <div className="h-5 bg-slate-800 rounded-full w-16" />
            </div>
          </div>
          <div className="h-16 bg-slate-900/50 border border-slate-700/50 rounded-xl" />
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-4">
              <div className="h-40 bg-slate-900/50 border border-slate-700/50 rounded-xl" />
              <div className="h-24 bg-slate-900/50 border border-slate-700/50 rounded-xl" />
            </div>
            <div className="h-64 bg-slate-900/50 border border-slate-700/50 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    const errStatus = error && 'status' in error ? error.status : null
    const errDetail =
      error && 'data' in error && error.data && typeof error.data === 'object'
        ? ((error.data as Record<string, unknown>).detail ??
          (error.data as Record<string, unknown>).error)
        : null
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Link
          to={fromPlan ? '/plan/$slug' : '/'}
          params={fromPlan ? { slug: fromPlan.slug } : undefined}
          className="inline-flex items-center text-sm text-slate-400 hover:text-cyan-400 mb-6 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {fromPlan ? fromPlan.title : 'Roadmap'}
        </Link>
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg font-mono text-sm space-y-1">
          <div>
            ERROR:{' '}
            {error
              ? errStatus === 404
                ? 'Story not found'
                : 'Failed to fetch story'
              : 'Story not found'}
          </div>
          {errStatus && <div className="text-red-400/60 text-xs">HTTP {errStatus}</div>}
          {errDetail != null && (
            <div className="text-red-400/60 text-xs break-all">{String(errDetail)}</div>
          )}
        </div>
      </div>
    )
  }

  const isCompleted = data.state === 'completed'
  const blockedBy = isCompleted ? [] : data.blockedByIds
  const blocks = data.blocksIds
  const acSection = data.contentSections.find(s => s.sectionName === 'acceptance_criteria')

  const isSubtaskSection = (s: { sectionName: string; contentText: string | null }) => {
    if (s.sectionName === 'acceptance_criteria') return false
    if (!s.contentText) return false
    try {
      const parsed = JSON.parse(s.contentText)
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
        return 'title' in (parsed[0] as Record<string, unknown>)
      }
    } catch {
      /* not JSON */
    }
    return false
  }

  const contentSections = data.contentSections.filter(s => {
    if (s.sectionName === 'acceptance_criteria') return false
    if (!s.contentText) return false
    return !isSubtaskSection(s)
  })

  const subtaskSections = data.contentSections.filter(isSubtaskSection)

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <StoryHeader data={data} fromPlan={fromPlan} />

      {data.state !== 'cancelled' && data.state !== 'completed' && data.state !== 'UAT' && (
        <div className="flex justify-end mb-4">
          <CustomButton
            variant="outline"
            size="sm"
            onClick={() => setShowCancelDialog(true)}
            className="text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
          >
            <Ban className="h-3.5 w-3.5 mr-1.5" />
            Cancel Story
          </CustomButton>
          <ConfirmationDialog
            open={showCancelDialog}
            onOpenChange={setShowCancelDialog}
            title="Cancel Story?"
            description={
              data.blocksIds.length > 0
                ? `This will cancel ${data.storyId}. The following stories depend on it and may be impacted: ${data.blocksIds.join(', ')}.`
                : `Are you sure you want to cancel ${data.storyId}? This action cannot be easily undone.`
            }
            confirmText="Cancel Story"
            variant="destructive"
            onConfirm={handleCancelStory}
            loading={cancelling}
          />
        </div>
      )}

      {/* Pipeline strip */}
      <div className="mb-6">
        <PipelineStrip state={data.state} />
      </div>

      {/* Blocked reason banner */}
      {data.blockedReason && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400 mb-0.5">Blocked</p>
            <p className="text-sm text-red-300/80">{data.blockedReason}</p>
          </div>
        </div>
      )}

      {/* Body */}
      <AppTabs defaultValue="overview" className="w-full">
        <AppTabsList className="mb-6">
          <AppTabsTrigger value="overview">Overview</AppTabsTrigger>
          {data.elaboration && <AppTabsTrigger value="elab">Elaboration</AppTabsTrigger>}
          {data.evidence && <AppTabsTrigger value="dev">Dev Evidence</AppTabsTrigger>}
          {data.review && <AppTabsTrigger value="review">Review</AppTabsTrigger>}
          {data.qaGate && <AppTabsTrigger value="qa">QA Gate</AppTabsTrigger>}
          {data.verification && <AppTabsTrigger value="verify">Verification</AppTabsTrigger>}
        </AppTabsList>

        <AppTabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Main column */}
            <div className="md:col-span-3 space-y-6">
              <DependenciesCard blockedBy={blockedBy} blocks={blocks} />

              {/* Content Sections */}
              {contentSections.length > 0 && (
                <DetailCard>
                  <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
                    Story Content
                  </h2>
                  <div className="space-y-4">
                    {contentSections.map(section => (
                      <div key={section.sectionName} className="group">
                        <div className="flex items-center gap-2 mb-1.5">
                          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            {section.sectionName.replace(/_/g, ' ')}
                          </h3>
                          {editingSection !== section.sectionName && (
                            <CustomButton
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSectionValue(section.contentText ?? '')
                                setEditingSection(section.sectionName)
                              }}
                              className="opacity-0 group-hover:opacity-100 h-5 w-5 text-slate-500 hover:text-cyan-400"
                              title="Edit"
                            >
                              <Pencil className="h-3 w-3" />
                            </CustomButton>
                          )}
                        </div>
                        {editingSection === section.sectionName ? (
                          <div className="space-y-2">
                            <Textarea
                              value={sectionValue}
                              onChange={e => setSectionValue(e.target.value)}
                              rows={6}
                              className="text-sm bg-slate-800/50 border-slate-600/50 text-slate-100 resize-y w-full"
                              autoFocus
                            />
                            <div className="flex items-center gap-2">
                              <CustomButton
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSectionSave(section.sectionName)}
                                className="h-8 w-8 text-green-400 hover:text-green-300"
                                title="Save"
                              >
                                <Check className="h-4 w-4" />
                              </CustomButton>
                              <CustomButton
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingSection(null)}
                                className="h-8 w-8 text-red-400 hover:text-red-300"
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </CustomButton>
                            </div>
                          </div>
                        ) : (
                          <SectionContent
                            content={section.contentText}
                            sectionName={section.sectionName}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </DetailCard>
              )}

              {/* Subtask Sections */}
              {subtaskSections.map(section => {
                let items: Array<{ id?: string; title: string; files?: string[] }> = []
                try {
                  items = JSON.parse(section.contentText!)
                } catch {
                  /* ignore */
                }
                return (
                  <DetailCard key={section.sectionName}>
                    <h2 className="text-base font-semibold mb-3 text-slate-300 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 inline-block" />
                      {section.sectionName
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, c => c.toUpperCase())}
                      <span className="text-xs text-slate-600 font-normal font-mono ml-1">
                        {items.length}
                      </span>
                    </h2>
                    <ul className="space-y-2">
                      {items.map((item, i) => (
                        <li key={item.id ?? i} className="flex items-start gap-2.5">
                          <span className="font-mono text-xs text-cyan-500/40 shrink-0 mt-0.5 w-10 text-right">
                            {item.id ?? `${i + 1}.`}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-300 leading-relaxed">{item.title}</p>
                            {item.files && item.files.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {item.files.map(f => (
                                  <span
                                    key={f}
                                    className="font-mono text-xs text-slate-500 bg-slate-800/60 rounded px-1.5 py-0.5 break-all"
                                  >
                                    {f.split('/').pop()}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </DetailCard>
                )
              })}

              {/* Description */}
              {(data.description || editingDescription) && (
                <DetailCard className="group">
                  <h2 className="text-base font-semibold mb-3 text-slate-300 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500 inline-block" />
                    Description
                    {!editingDescription && (
                      <CustomButton
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDescriptionValue(data.description ?? '')
                          setEditingDescription(true)
                        }}
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 text-slate-500 hover:text-cyan-400 ml-auto"
                        title="Edit description"
                      >
                        <Pencil className="h-3 w-3" />
                      </CustomButton>
                    )}
                  </h2>
                  {editingDescription ? (
                    <div className="space-y-2">
                      <Textarea
                        value={descriptionValue}
                        onChange={e => setDescriptionValue(e.target.value)}
                        rows={6}
                        className="text-sm bg-slate-800/50 border-slate-600/50 text-slate-100 resize-y w-full"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <CustomButton
                          variant="ghost"
                          size="icon"
                          onClick={handleDescriptionSave}
                          className="h-8 w-8 text-green-400 hover:text-green-300"
                          title="Save"
                        >
                          <Check className="h-4 w-4" />
                        </CustomButton>
                        <CustomButton
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingDescription(false)}
                          className="h-8 w-8 text-red-400 hover:text-red-300"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </CustomButton>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-300 leading-relaxed whitespace-pre-wrap text-sm">
                      {data.description}
                    </p>
                  )}
                </DetailCard>
              )}

              {/* Acceptance Criteria */}
              {acSection?.contentText &&
                (() => {
                  let acItems: { id?: string; text: string }[] = []
                  try {
                    const parsed = JSON.parse(acSection.contentText)
                    if (Array.isArray(parsed)) {
                      acItems = parsed.map(item =>
                        typeof item === 'string'
                          ? { text: item }
                          : { id: item.id, text: item.text ?? String(item) },
                      )
                    }
                  } catch {
                    acItems = [{ text: acSection.contentText }]
                  }
                  return (
                    <DetailCard>
                      <h2 className="text-base font-semibold mb-3 text-slate-300 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                        Acceptance Criteria
                        <span className="text-xs text-slate-600 font-normal font-mono ml-1">
                          {acItems.length}
                        </span>
                        {data.evidence?.acMet != null && data.evidence?.acTotal != null && (
                          <span
                            className={`text-xs font-mono font-normal px-1.5 py-0.5 rounded ml-auto ${data.evidence.acMet === data.evidence.acTotal ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'}`}
                          >
                            {data.evidence.acMet}/{data.evidence.acTotal} met
                          </span>
                        )}
                      </h2>
                      <ul className="space-y-2.5">
                        {acItems.map((item, i) => (
                          <li key={item.id ?? i} className="flex items-start gap-2.5">
                            <span className="font-mono text-xs text-emerald-500/50 shrink-0 mt-0.5 w-10 text-right">
                              {item.id ?? `${i + 1}.`}
                            </span>
                            <span className="text-sm text-slate-300 leading-relaxed">
                              {item.text}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </DetailCard>
                  )
                })()}

              {data.outcome && <OutcomeCard outcome={data.outcome} />}

              <ActivityTimeline stateHistory={data.stateHistory} />
            </div>

            {/* Sidebar */}
            <StorySidebar data={data} />
          </div>
        </AppTabsContent>

        {/* Elaboration artifact tab */}
        {data.elaboration && (
          <AppTabsContent value="elab">
            <ArtifactJsonViewer
              title="Elaboration"
              data={data.elaboration.data}
              meta={[
                { label: 'Verdict', value: data.elaboration.verdict },
                { label: 'Complexity', value: data.elaboration.risk },
                { label: 'Confidence', value: data.elaboration.confidence },
                {
                  label: 'Skill Level',
                  value: data.elaboration.skillLevel?.replace(/_/g, ' ') ?? null,
                },
                { label: 'Estimate', value: data.elaboration.implementationEstimate },
              ]}
            />
          </AppTabsContent>
        )}

        {/* Dev Evidence artifact tab */}
        {data.evidence && (
          <AppTabsContent value="dev">
            <ArtifactJsonViewer
              title="Dev Evidence"
              data={data.evidence.data}
              meta={[
                { label: 'AC Status', value: data.evidence.acStatus },
                {
                  label: 'ACs Met',
                  value:
                    data.evidence.acMet != null && data.evidence.acTotal != null
                      ? `${data.evidence.acMet} / ${data.evidence.acTotal}`
                      : null,
                },
                {
                  label: 'Tests Passed',
                  value:
                    data.evidence.testPassCount != null
                      ? String(data.evidence.testPassCount)
                      : null,
                },
                {
                  label: 'Tests Failed',
                  value:
                    data.evidence.testFailCount != null
                      ? String(data.evidence.testFailCount)
                      : null,
                },
              ]}
            />
          </AppTabsContent>
        )}

        {/* QA Gate artifact tab */}
        {data.qaGate && (
          <AppTabsContent value="qa">
            <ArtifactJsonViewer
              title="QA Gate"
              data={data.qaGate.data}
              meta={[
                { label: 'Decision', value: data.qaGate.decision },
                { label: 'Reviewer', value: data.qaGate.reviewer },
                {
                  label: 'Findings',
                  value: data.qaGate.findingCount != null ? String(data.qaGate.findingCount) : null,
                },
                {
                  label: 'Blockers',
                  value: data.qaGate.blockerCount != null ? String(data.qaGate.blockerCount) : null,
                },
              ]}
            />
          </AppTabsContent>
        )}

        {/* Review tab */}
        {data.review && (
          <AppTabsContent value="review">
            <ReviewTab review={data.review} />
          </AppTabsContent>
        )}

        {/* Verification tab */}
        {data.verification && (
          <AppTabsContent value="verify">
            <VerificationTab verification={data.verification} />
          </AppTabsContent>
        )}
      </AppTabs>
    </div>
  )
}
