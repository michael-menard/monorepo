import { AppBadge, CustomButton } from '@repo/app-component-library'
import { Pencil } from 'lucide-react'
import { DetailCard } from '../shared/DetailCard'
import { EditableField } from './EditableField'
import { ActivityRings, type StoryStats } from './ActivityRings'
import type { PlanDetails } from '../../store/roadmapApi'

export function PlanOverviewCard({
  data,
  storyStats,
  lastWorkedAt,
  editingField,
  setEditingField,
  handleUpdate,
}: {
  data: PlanDetails
  storyStats: StoryStats | null
  lastWorkedAt: string | null
  editingField: string | null
  setEditingField: (field: string | null) => void
  handleUpdate: (field: string, value: string | number) => void
}) {
  return (
    <DetailCard>
      <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 inline-block" />
        Overview
      </h2>
      <div className="grid grid-cols-[auto_1fr_auto] gap-x-12">
        {/* Column 1: Type, Story Prefix, Priority, Created, Last Worked */}
        <div className="flex flex-col gap-4">
          <EditableField
            label="Type"
            value={data.planType}
            isEditing={editingField === 'planType'}
            onStartEdit={() => setEditingField('planType')}
            onSave={value => handleUpdate('planType', value)}
            onCancel={() => setEditingField(null)}
            editable
          />
          <EditableField
            label="Story Prefix"
            value={data.storyPrefix}
            isEditing={editingField === 'storyPrefix'}
            onStartEdit={() => setEditingField('storyPrefix')}
            onSave={value => handleUpdate('storyPrefix', value)}
            onCancel={() => setEditingField(null)}
            editable
          />
          <EditableField
            label="Priority"
            value={data.priority}
            isEditing={editingField === 'priority'}
            onStartEdit={() => setEditingField('priority')}
            onSave={value => handleUpdate('priority', value)}
            onCancel={() => setEditingField(null)}
            editable
            options={['P1', 'P2', 'P3', 'P4', 'P5']}
          />
          <div>
            <dt className="text-sm font-medium text-slate-400">Created</dt>
            <dd className="text-slate-200">{new Date(data.createdAt).toLocaleDateString()}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-400">Last Worked</dt>
            <dd className="font-mono text-sm text-slate-400">{lastWorkedAt ?? '—'}</dd>
          </div>
        </div>

        {/* Column 2: Summary, Tags */}
        <div className="flex flex-col gap-4">
          <EditableField
            label="Summary"
            value={data.summary}
            isEditing={editingField === 'summary'}
            onStartEdit={() => setEditingField('summary')}
            onSave={value => handleUpdate('summary', value)}
            onCancel={() => setEditingField(null)}
            editable
            multiline
          />
          <div className="flex flex-wrap gap-2">
            <AppBadge variant="outline">{data.status}</AppBadge>
            {data.priority && (
              <AppBadge variant={data.priority === 'P1' ? 'destructive' : 'secondary'}>
                {data.priority}
              </AppBadge>
            )}
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-400 mb-2">Tags</dt>
            <dd className="flex flex-wrap gap-2">
              {data.tags && data.tags.length > 0 ? (
                data.tags.map(tag => (
                  <AppBadge key={tag} variant="secondary">
                    {tag}
                  </AppBadge>
                ))
              ) : (
                <span className="text-slate-500">-</span>
              )}
              <CustomButton
                variant="ghost"
                size="icon"
                onClick={() => setEditingField('tags')}
                className="h-6 w-6 text-slate-500 hover:text-cyan-400"
                title="Edit tags"
              >
                <Pencil className="h-3 w-3" />
              </CustomButton>
            </dd>
          </div>
        </div>

        {/* Column 3: Activity rings */}
        <div className="flex items-center justify-center pl-12">
          {storyStats ? (
            <ActivityRings stats={storyStats} />
          ) : (
            <span className="text-xs text-slate-500 font-mono self-center">No stories</span>
          )}
        </div>
      </div>
    </DetailCard>
  )
}
