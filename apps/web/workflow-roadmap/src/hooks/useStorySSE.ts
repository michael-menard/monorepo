import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { roadmapApi } from '../store/roadmapApi'

/**
 * Subscribes to server-sent events for story state changes and agent activity.
 * On each event, invalidates RTK Query cache tags so queries auto-refetch.
 * EventSource auto-reconnects on disconnect (built-in browser behavior).
 */
export function useStorySSE() {
  const dispatch = useDispatch()

  useEffect(() => {
    const es = new EventSource('/api/v1/events/stories')

    es.addEventListener('story_state_changed', event => {
      const payload = JSON.parse(event.data)
      dispatch(
        roadmapApi.util.invalidateTags([
          'Stories',
          'Plans',
          { type: 'Story', id: payload.storyId },
        ]),
      )
    })

    es.addEventListener('agent_activity_changed', () => {
      dispatch(roadmapApi.util.invalidateTags(['ActiveAgents']))
    })

    return () => es.close()
  }, [dispatch])
}
