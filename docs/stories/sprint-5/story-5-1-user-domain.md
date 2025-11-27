# Story 5.1: User Domain - Profile and Settings Management

**Sprint:** 5 (Weeks 9-10)  
**Story Points:** 21  
**Priority:** Medium  
**Dependencies:** Story 4.3  

## User Story
```
As a user
I want to manage my profile, preferences, and account settings
So that I can customize my experience and maintain my account
```

## Acceptance Criteria

### Frontend Changes
- [ ] Create apps/web/user-app with complete structure
  - [ ] Setup package.json with proper dependencies
  - [ ] Create src/ directory with App.tsx and main.tsx
  - [ ] Configure Vite build configuration for user-app
  - [ ] Setup TypeScript configuration and routing
- [ ] Build user profile management interface
  - [ ] Create profile page with avatar, name, email display
  - [ ] Add profile editing form with validation
  - [ ] Implement avatar upload with image cropping
  - [ ] Add bio, location, and LEGO interests fields
  - [ ] Show account creation date and statistics
- [ ] Create preferences and settings pages
  - [ ] Build general preferences (theme, language, timezone)
  - [ ] Add notification settings (email, push, in-app)
  - [ ] Create privacy settings and data controls
  - [ ] Add import preferences (default sources, auto-save)
  - [ ] Include accessibility settings and options
- [ ] Implement account security settings
  - [ ] Create password change form with validation
  - [ ] Add two-factor authentication setup
  - [ ] Show active sessions and device management
  - [ ] Add account deletion and data export options
  - [ ] Include security audit log display
- [ ] Build credential management interface
  - [ ] Create platform credentials management page
  - [ ] Show connected accounts (Rebrickable, BrickLink)
  - [ ] Add credential testing and status indicators
  - [ ] Implement credential refresh and re-authentication
  - [ ] Add credential deletion with confirmation

### Backend Changes
- [ ] Create user profile API endpoints
  - [ ] GET /api/user/profile for profile data retrieval
  - [ ] PUT /api/user/profile for profile updates
  - [ ] POST /api/user/avatar for avatar upload
  - [ ] DELETE /api/user/avatar for avatar removal
  - [ ] GET /api/user/statistics for user statistics
- [ ] Implement user preferences storage and retrieval
  - [ ] Create preferences data model and validation
  - [ ] Add preferences API endpoints (GET/PUT)
  - [ ] Implement preference inheritance and defaults
  - [ ] Add preference change history and auditing
- [ ] Build account security features
  - [ ] Implement password change with validation
  - [ ] Add two-factor authentication (TOTP)
  - [ ] Create session management and device tracking
  - [ ] Add security event logging and monitoring
  - [ ] Implement account lockout and security policies
- [ ] Create data export and account deletion
  - [ ] Implement user data export in JSON/CSV formats
  - [ ] Add account deletion with data cleanup
  - [ ] Create data retention and deletion policies
  - [ ] Add GDPR compliance features
- [ ] Implement notification system
  - [ ] Create notification preferences management
  - [ ] Add email notification templates and sending
  - [ ] Implement in-app notification system
  - [ ] Add notification history and read status

### Database Changes
- [ ] Create user_profiles table for extended user information
  - [ ] Add bio, location, avatar_url, interests fields
  - [ ] Include profile visibility and privacy settings
  - [ ] Add profile completion percentage tracking
  - [ ] Create indexes for profile searches
- [ ] Add user_preferences table for settings storage
  - [ ] Store theme, language, timezone preferences
  - [ ] Include notification and privacy preferences
  - [ ] Add import and display preferences
  - [ ] Track preference change history
- [ ] Create user_sessions table for session management
  - [ ] Store session tokens, device info, IP addresses
  - [ ] Track session creation, last activity, expiration
  - [ ] Add session security flags and risk scores
  - [ ] Implement session cleanup and management
- [ ] Add security_events table for audit logging
  - [ ] Log login attempts, password changes, security events
  - [ ] Store event details, IP addresses, user agents
  - [ ] Add event severity and risk assessment
  - [ ] Track security event patterns and anomalies
- [ ] Create notifications table for in-app notifications
  - [ ] Store notification content, type, priority
  - [ ] Track read status, delivery status, user preferences
  - [ ] Add notification expiration and cleanup
  - [ ] Include notification analytics and engagement

### API Changes
- [ ] Create comprehensive user management API
  - [ ] GET /api/user/profile - retrieve user profile
  - [ ] PUT /api/user/profile - update profile information
  - [ ] GET /api/user/preferences - get user preferences
  - [ ] PUT /api/user/preferences - update preferences
  - [ ] POST /api/user/change-password - change password
- [ ] Add security and session management endpoints
  - [ ] GET /api/user/sessions - list active sessions
  - [ ] DELETE /api/user/sessions/:id - terminate session
  - [ ] POST /api/user/2fa/setup - setup two-factor auth
  - [ ] POST /api/user/2fa/verify - verify 2FA token
  - [ ] GET /api/user/security-events - security audit log
- [ ] Implement data management endpoints
  - [ ] GET /api/user/export - export user data
  - [ ] POST /api/user/delete-account - initiate account deletion
  - [ ] GET /api/user/statistics - user activity statistics
  - [ ] GET /api/user/notifications - get notifications
  - [ ] PUT /api/user/notifications/:id/read - mark as read

### Testing & Quality
- [ ] Unit tests for user profile components
  - [ ] Test profile display and editing functionality
  - [ ] Test avatar upload and cropping
  - [ ] Test preferences and settings forms
  - [ ] Test security settings and validation
- [ ] Integration tests for user API endpoints
  - [ ] Test profile CRUD operations
  - [ ] Test preferences storage and retrieval
  - [ ] Test security features (password change, 2FA)
  - [ ] Test session management and cleanup
- [ ] Security tests for user management features
  - [ ] Test authentication and authorization
  - [ ] Test password security and validation
  - [ ] Test session security and hijacking prevention
  - [ ] Test data privacy and access controls
- [ ] E2E tests for user management workflows
  - [ ] Test complete profile setup and editing
  - [ ] Test preferences and settings changes
  - [ ] Test security feature usage
  - [ ] Test account deletion and data export
- [ ] Performance tests for user operations
  - [ ] Test profile loading and update performance
  - [ ] Test avatar upload and processing performance
  - [ ] Test notification system performance
  - [ ] Test concurrent user operations
- [ ] Linter runs and passes
  - [ ] ESLint passes with no errors
  - [ ] Prettier formatting applied
  - [ ] TypeScript compilation successful

## Technical Implementation Notes

### User App Structure
```
apps/web/user-app/
├── src/
│   ├── App.tsx                 # User app root
│   ├── main.tsx               # Entry point
│   ├── components/
│   │   ├── Profile/           # Profile components
│   │   │   ├── ProfileView.tsx
│   │   │   ├── ProfileEdit.tsx
│   │   │   └── AvatarUpload.tsx
│   │   ├── Settings/          # Settings components
│   │   │   ├── GeneralSettings.tsx
│   │   │   ├── SecuritySettings.tsx
│   │   │   └── NotificationSettings.tsx
│   │   └── Credentials/       # Credential management
│   │       └── CredentialManager.tsx
│   ├── routes/
│   │   ├── index.ts           # User routing
│   │   └── pages/
│   │       ├── ProfilePage.tsx
│   │       ├── SettingsPage.tsx
│   │       └── SecurityPage.tsx
│   └── services/
│       └── userApi.ts         # User API client
```

### User Preferences Schema
```typescript
interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  notifications: {
    email: boolean
    push: boolean
    inApp: boolean
    importComplete: boolean
    securityAlerts: boolean
  }
  privacy: {
    profileVisibility: 'public' | 'private'
    showStatistics: boolean
    allowDataCollection: boolean
  }
  imports: {
    defaultPlatform: 'rebrickable' | 'bricklink'
    autoSave: boolean
    requireReview: boolean
  }
}
```

### Database Schema
```sql
CREATE TABLE user_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) UNIQUE,
  bio TEXT,
  location VARCHAR(255),
  avatar_url TEXT,
  interests TEXT[],
  profile_visibility VARCHAR(20) DEFAULT 'public',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) UNIQUE,
  preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  session_token VARCHAR(255) UNIQUE NOT NULL,
  device_info JSONB,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);
```

## Definition of Done Checklist
- [ ] All acceptance criteria met
- [ ] Code reviewed and approved
- [ ] Unit tests written and passing (>90% coverage)
- [ ] Integration tests passing
- [ ] **Linter runs and passes (ESLint + Prettier)**
- [ ] Accessibility requirements met
- [ ] Performance requirements met
- [ ] Documentation updated
- [ ] QA testing completed
- [ ] Product Owner acceptance

## Dependencies
- Error handling system from Story 4.3
- Authentication and session management infrastructure
- Notification system setup

## Risks & Mitigation
- **Risk:** Complex user preferences affecting performance
- **Mitigation:** Implement efficient preference caching and validation
- **Risk:** Security vulnerabilities in user management
- **Mitigation:** Comprehensive security testing and audit
