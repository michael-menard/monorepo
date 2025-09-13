module.exports = {
    // Where to look for PRDs in your monorepo
    prdGlobs: [
      'web/**/prds/**/*.md',         // all React frontend apps
      'apps/api/**/prds/**/*.md',    // backend services
      'packages/**/prds/**/*.md'     // shared UI/components/utils
    ],
  
    // Group tags for filtering in TaskMaster views
    tagGroups: {
      'Frontend': ['@frontend'],
      'Backend': ['@backend'],
      'Shared': ['@shared', '#component-library'],
      'Features': [
        '#auth', '#profile', '#wishlist', '#inspiration-gallery',
        '#dragdrop', '#fileupload', '#albums', '#elasticsearch',
        '#moderation', '#preview'
      ],
      'Tasks': [
        '#ux', '#routing', '#form-validation', '#accessibility', 
        '#responsive', '#animation', '#search'
      ],
      'Infra': ['#postgres', '#s3', '#privacy', '#database'],
      'Moderation': ['#moderation', '#reporting'],
      'Search': ['#elasticsearch', '#filter'],
      'Priority': ['!priority']
    },
  
    // Priority config
    priorityTag: '!priority',
    defaultPriority: 5,
  
    // Optional sorting, default filters, or lint behavior (optional)
    sortBy: 'priority',         // 'priority' | 'tag' | 'path'
    showUnprioritized: true,    // show PRDs without priority set
    excludeDrafts: false,       // can ignore WIP files if needed
  
    // Optional metadata enforcement
    requireTags: true,          // warn or error if PRD missing tags
    requirePriority: true,      // warn or error if PRD missing priority
  };
  