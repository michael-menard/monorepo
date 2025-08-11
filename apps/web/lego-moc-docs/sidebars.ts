import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  // Custom sidebar for LEGO MOC Instructions documentation
  tutorialSidebar: [
    'intro',
    'api',
    {
      type: 'category',
      label: 'Tutorials',
      items: [
        'tutorials/create-first-moc',
      ],
    },
    {
      type: 'category',
      label: 'User Guide',
      items: [
        'user-guide/getting-started',
        // 'user-guide/account-management',
        // 'user-guide/gallery-features',
        // 'user-guide/wishlist-management',
      ],
    },
    {
      type: 'category',
      label: 'Developer Guide',
      items: [
        'developer-guide/docusaurus-usage',
        'developer-guide/docusaurus-quick-reference',
        'developer-guide/component-examples',
        // 'developer-guide/installation',
        // 'developer-guide/architecture',
        // 'developer-guide/contributing',
      ],
    },
  ],
};

export default sidebars;
