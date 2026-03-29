import { Hono } from 'hono'

export const graphRoutes = new Hono()

graphRoutes.post('/graphs/dev-implement', c => {
  return c.json({ status: 'accepted', graph: 'dev-implement' }, 202)
})

graphRoutes.post('/graphs/story-generation', c => {
  return c.json({ status: 'accepted', graph: 'story-generation' }, 202)
})

graphRoutes.post('/graphs/review', c => {
  return c.json({ status: 'accepted', graph: 'review' }, 202)
})

graphRoutes.post('/graphs/qa-verify', c => {
  return c.json({ status: 'accepted', graph: 'qa-verify' }, 202)
})

graphRoutes.post('/graphs/plan-refinement', c => {
  return c.json({ status: 'accepted', graph: 'plan-refinement' }, 202)
})
