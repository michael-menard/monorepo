module.exports = {
  prdGlobs: [
    'web/**/prds/**/*.md', // all React apps
    'apps/api/**/prds/**/*.md', // all API/backend services
    'packages/**/prds/**/*.md', // shared components and utils
  ],
  tagGroups: {
    Frontend: ['@frontend'],
    Backend: ['@backend'],
    Shared: ['@shared', '#component-library'],
    Priority: ['!priority'],
  },
  priorityTag: '!priority',
  defaultPriority: 5,
}
