import React from 'react'
import { RouteGuard } from '../src/index.js'

/**
 * Examples of how to use the RouteGuard component in different scenarios
 */

// Example 1: Basic authentication protection
export const BasicProtectedPage = () => (
  <RouteGuard>
    <div>
      <h1>Protected Content</h1>
      <p>This content is only visible to authenticated users.</p>
    </div>
  </RouteGuard>
)

// Example 2: Admin-only access
export const AdminPage = () => (
  <RouteGuard requiredRole="admin">
    <div>
      <h1>Admin Dashboard</h1>
      <p>This content is only visible to admin users.</p>
      <button>Delete User</button>
      <button>Manage Settings</button>
    </div>
  </RouteGuard>
)

// Example 3: Moderator access
export const ModeratorPage = () => (
  <RouteGuard requiredRole="moderator">
    <div>
      <h1>Moderator Panel</h1>
      <p>This content is only visible to moderators and admins.</p>
      <button>Review Posts</button>
      <button>Manage Comments</button>
    </div>
  </RouteGuard>
)

// Example 4: Email verification required
export const VerifiedUserPage = () => (
  <RouteGuard requireVerified={true}>
    <div>
      <h1>Verified User Content</h1>
      <p>This content requires email verification.</p>
      <button>Access Premium Features</button>
    </div>
  </RouteGuard>
)

// Example 5: Custom redirect paths
export const CustomProtectedPage = () => (
  <RouteGuard redirectTo="/auth/login" unauthorizedTo="/auth/access-denied">
    <div>
      <h1>Custom Protected Content</h1>
      <p>This uses custom redirect paths.</p>
    </div>
  </RouteGuard>
)

// Example 6: Admin with email verification
export const AdminVerifiedPage = () => (
  <RouteGuard
    requiredRole="admin"
    requireVerified={true}
    redirectTo="/admin/login"
    unauthorizedTo="/admin/unauthorized"
  >
    <div>
      <h1>Admin Verified Content</h1>
      <p>This requires admin role and email verification.</p>
      <button>System Settings</button>
      <button>User Management</button>
    </div>
  </RouteGuard>
)

// Example 7: Nested route protection
export const NestedProtectedLayout = () => (
  <RouteGuard>
    <div>
      <header>
        <h1>Protected Application</h1>
        <nav>
          <a href="/dashboard">Dashboard</a>
          <a href="/profile">Profile</a>
          <a href="/settings">Settings</a>
        </nav>
      </header>

      <main>
        {/* Individual pages can have their own protection */}
        <RouteGuard requiredRole="admin">
          <div>
            <h2>Admin Section</h2>
            <p>Only admins can see this section.</p>
          </div>
        </RouteGuard>

        <RouteGuard requireVerified={true}>
          <div>
            <h2>Verified User Section</h2>
            <p>Only verified users can see this section.</p>
          </div>
        </RouteGuard>
      </main>
    </div>
  </RouteGuard>
)

// Example 8: Profile page with protection
export const ProtectedProfilePage = () => (
  <RouteGuard requireVerified={true}>
    <div>
      <h1>User Profile</h1>
      <div>
        <h2>Personal Information</h2>
        <form>
          <input type="text" placeholder="First Name" />
          <input type="text" placeholder="Last Name" />
          <input type="email" placeholder="Email" />
          <button type="submit">Update Profile</button>
        </form>
      </div>

      <div>
        <h2>Security Settings</h2>
        <button>Change Password</button>
        <button>Enable 2FA</button>
      </div>
    </div>
  </RouteGuard>
)

// Example 9: Dashboard with role-based sections
export const RoleBasedDashboard = () => (
  <RouteGuard>
    <div>
      <h1>Dashboard</h1>

      {/* User section - visible to all authenticated users */}
      <section>
        <h2>My Account</h2>
        <p>Welcome back!</p>
      </section>

      {/* Moderator section */}
      <RouteGuard requiredRole="moderator">
        <section>
          <h2>Moderation Tools</h2>
          <button>Review Reports</button>
          <button>Manage Users</button>
        </section>
      </RouteGuard>

      {/* Admin section */}
      <RouteGuard requiredRole="admin">
        <section>
          <h2>Administration</h2>
          <button>System Settings</button>
          <button>User Management</button>
          <button>Analytics</button>
        </section>
      </RouteGuard>
    </div>
  </RouteGuard>
)

// Example 10: Settings page with different access levels
export const SettingsPage = () => (
  <RouteGuard requireVerified={true}>
    <div>
      <h1>Settings</h1>

      {/* Basic settings - all verified users */}
      <section>
        <h2>Account Settings</h2>
        <button>Edit Profile</button>
        <button>Change Password</button>
        <button>Notification Preferences</button>
      </section>

      {/* Advanced settings - moderators and admins */}
      <RouteGuard requiredRole="moderator">
        <section>
          <h2>Moderation Settings</h2>
          <button>Auto-moderation Rules</button>
          <button>Report Thresholds</button>
        </section>
      </RouteGuard>

      {/* System settings - admins only */}
      <RouteGuard requiredRole="admin">
        <section>
          <h2>System Settings</h2>
          <button>Server Configuration</button>
          <button>Database Management</button>
          <button>Security Policies</button>
        </section>
      </RouteGuard>
    </div>
  </RouteGuard>
)
