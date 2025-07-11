# Auth UI - React Authentication Service

A modern React application for user authentication with a beautiful UI built using Tailwind CSS, shadcn/ui, and Framer Motion.

## Features

- 🔐 **User Authentication**: Login, signup, and logout functionality
- 🔒 **Password Reset**: Secure password reset via email
- 🎨 **Modern UI**: Beautiful interface with Tailwind CSS and shadcn/ui
- 📱 **Responsive Design**: Works perfectly on all devices
- ⚡ **Fast Performance**: Optimized with React 18 and modern tooling
- 🔒 **Security**: Helmet for security headers, CORS support
- 📝 **Form Validation**: Zod schema validation with react-hook-form
- 🎭 **Animations**: Smooth transitions with Framer Motion
- 🎯 **TypeScript**: Full type safety throughout the application

## Tech Stack

- **React 18** - Modern React with hooks
- **TypeScript** - Type safety and better developer experience
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Beautiful and accessible UI components
- **Framer Motion** - Smooth animations and transitions
- **React Hook Form** - Performant forms with validation
- **Zod** - TypeScript-first schema validation
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls
- **React Helmet Async** - Document head management
- **Lucide React** - Beautiful icons

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn
- The auth-service backend running

### Installation

1. **Clone the repository**
   ```bash
   cd apps/web/auth-ui
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your API URL:
   ```
   REACT_APP_API_URL=https://your-api-id.execute-api.region.amazonaws.com/dev/auth
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/            # shadcn/ui components
│   └── LoadingSpinner.tsx
├── hooks/             # Custom React hooks
│   └── useAuth.ts     # Authentication hook
├── lib/               # Utility libraries
│   └── utils.ts       # Utility functions
├── pages/             # Page components
│   ├── LoginPage.tsx
│   ├── SignupPage.tsx
│   ├── DashboardPage.tsx
│   └── ResetPasswordPage.tsx
├── services/          # API services
│   └── api.ts         # Axios configuration
├── types/             # TypeScript type definitions
│   └── auth.ts        # Authentication types
├── App.tsx            # Main app component
├── index.tsx          # App entry point
└── index.css          # Global styles
```

## Authentication Flow

### Login
- User enters email and password
- Form validation with Zod
- API call to `/login` endpoint
- JWT tokens stored in localStorage
- Redirect to dashboard on success

### Signup
- User enters name, email, and password
- Password confirmation validation
- API call to `/signup` endpoint
- Success message and redirect to login

### Password Reset
- User enters email address
- API call to `/reset-password` endpoint
- Email sent with reset link
- Success page with instructions

### Logout
- API call to `/logout` endpoint
- Clear localStorage tokens
- Redirect to login page

## API Integration

The app integrates with the auth-service backend API:

- **Base URL**: Configurable via `REACT_APP_API_URL`
- **Endpoints**:
  - `POST /login` - User authentication
  - `POST /signup` - User registration
  - `POST /logout` - User logout
  - `POST /refresh` - Token refresh
  - `POST /reset-password` - Password reset request
  - `POST /confirm-reset` - Password reset confirmation
  - `GET /health` - Health check

## Security Features

- **JWT Token Management**: Automatic token refresh
- **CORS Support**: Cross-origin request handling
- **Helmet**: Security headers
- **Input Validation**: Zod schema validation
- **Error Handling**: Comprehensive error management

## Styling

The app uses a modern design system:

- **Color Scheme**: CSS custom properties for theming
- **Typography**: Consistent font hierarchy
- **Spacing**: Tailwind's spacing scale
- **Components**: shadcn/ui component library
- **Animations**: Framer Motion for smooth transitions

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API URL | `https://your-api-id.execute-api.region.amazonaws.com/dev/auth` |
| `REACT_APP_ENV` | Environment name | `development` |

## Deployment

### Build for Production

```bash
npm run build
```

The build output will be in the `build/` directory.

### Deploy to Static Hosting

The app can be deployed to any static hosting service:

- **Vercel**: Connect your GitHub repository
- **Netlify**: Drag and drop the `build/` folder
- **AWS S3**: Upload the `build/` folder to an S3 bucket
- **GitHub Pages**: Use the `gh-pages` package

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
