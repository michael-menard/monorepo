# LEGO MOC Instructions Documentation

This is the documentation site for the LEGO MOC Instructions platform, built with Docusaurus.

## What is LEGO MOC Instructions?

LEGO MOC Instructions is a comprehensive platform for LEGO enthusiasts to create, share, and discover custom LEGO builds (MOCs - My Own Creations). This documentation site provides guides, tutorials, and API reference for users and developers.

## Features

- **User Guides**: Step-by-step tutorials for creating MOCs
- **API Documentation**: Complete reference for developers
- **Tutorials**: Interactive guides for getting started
- **Community Resources**: Links to community forums and support

## Getting Started

### Prerequisites

- Node.js 18.0 or above
- pnpm (recommended) or npm

### Installation

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start the development server:
   ```bash
   pnpm start
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
pnpm build
```

### Serving the Production Build

```bash
pnpm serve
```

## Project Structure

```
lego-moc-docs/
├── docs/                    # Documentation pages
│   ├── intro.md            # Welcome page
│   ├── api.md              # API reference
│   ├── tutorials/          # Tutorial guides
│   ├── user-guide/         # User documentation
│   └── developer-guide/    # Developer documentation
├── src/
│   ├── css/               # Custom styles
│   ├── components/        # React components
│   └── pages/            # Custom pages
├── static/               # Static assets
├── docusaurus.config.ts  # Docusaurus configuration
└── sidebars.ts          # Sidebar configuration
```

## Customization

### Styling

The site uses LEGO-themed colors and styling defined in `src/css/custom.css`:

- **Primary Color**: LEGO Red (#e31e24)
- **Secondary Colors**: LEGO Blue, Yellow, Green, Orange
- **Custom Components**: LEGO-themed cards, buttons, and patterns

### Configuration

Main configuration is in `docusaurus.config.ts`:
- Site metadata and branding
- Navigation and footer links
- Theme configuration
- Plugin settings

### Content

- **Documentation**: Add new `.md` files to the `docs/` directory
- **Blog Posts**: Add new `.md` files to the `blog/` directory
- **Custom Pages**: Create React components in `src/pages/`

## Development

### Adding New Documentation

1. Create a new `.md` file in the appropriate directory
2. Add frontmatter with metadata:
   ```markdown
   ---
   sidebar_position: 1
   ---
   ```
3. Update `sidebars.ts` to include the new page

### Custom Components

Create React components in `src/components/` and import them in your documentation:

```jsx
import MyComponent from '@site/src/components/MyComponent';

<MyComponent />
```

### Styling

Add custom CSS to `src/css/custom.css` or create component-specific styles.

## Deployment

### GitHub Pages

1. Build the site:
   ```bash
   pnpm build
   ```

2. Deploy to GitHub Pages:
   ```bash
   pnpm deploy
   ```

### Other Platforms

The built site is in the `build/` directory and can be deployed to any static hosting service.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `pnpm start`
5. Submit a pull request

## Support

- **Documentation**: Browse this site for guides and tutorials
- **Community**: Join our Discord server
- **Issues**: Report bugs on GitHub
- **Email**: Contact us directly for support

## Related Links

- [Main Application](http://localhost:3000) - The LEGO MOC Instructions app
- [API Documentation](/docs/api) - Complete API reference
- [Tutorials](/docs/tutorials) - Step-by-step guides
- [GitHub Repository](https://github.com/michaelmenard/lego-moc-instructions)

---

Built with [Docusaurus](https://docusaurus.io/) 🦖
