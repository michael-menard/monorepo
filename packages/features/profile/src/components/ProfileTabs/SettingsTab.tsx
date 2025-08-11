import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui';
import { ThemeToggle } from '@repo/ui';
import { User, Bell, Shield, Palette } from 'lucide-react';

export const SettingsTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Settings
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your account preferences and settings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-600" />
              <span>Profile Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium">Display Name</p>
                <p className="text-xs text-gray-500">Your public display name</p>
              </div>
              <button className="text-sm text-blue-600 hover:text-blue-700">Edit</button>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium">Email Address</p>
                <p className="text-xs text-gray-500">user@example.com</p>
              </div>
              <button className="text-sm text-blue-600 hover:text-blue-700">Change</button>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium">Avatar</p>
                <p className="text-xs text-gray-500">Profile picture</p>
              </div>
              <button className="text-sm text-blue-600 hover:text-blue-700">Upload</button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-green-600" />
              <span>Notifications</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium">Email Notifications</p>
                <p className="text-xs text-gray-500">Receive updates via email</p>
              </div>
              <div className="w-12 h-6 bg-blue-600 rounded-full relative">
                <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium">Push Notifications</p>
                <p className="text-xs text-gray-500">Browser notifications</p>
              </div>
              <div className="w-12 h-6 bg-gray-300 rounded-full relative">
                <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1"></div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium">Wishlist Alerts</p>
                <p className="text-xs text-gray-500">Price drops and availability</p>
              </div>
              <div className="w-12 h-6 bg-blue-600 rounded-full relative">
                <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Palette className="h-5 w-5 text-purple-600" />
              <span>Appearance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium">Theme</p>
                <p className="text-xs text-gray-500">Light, dark, or system mode</p>
              </div>
              <ThemeToggle variant="outline" size="sm" />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium">Language</p>
                <p className="text-xs text-gray-500">Interface language</p>
              </div>
              <select className="text-sm border border-gray-300 rounded px-2 py-1">
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
              </select>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium">Time Zone</p>
                <p className="text-xs text-gray-500">Your local time zone</p>
              </div>
              <select className="text-sm border border-gray-300 rounded px-2 py-1">
                <option>UTC-5 (Eastern Time)</option>
                <option>UTC-8 (Pacific Time)</option>
                <option>UTC+0 (GMT)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-red-600" />
              <span>Privacy & Security</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium">Two-Factor Authentication</p>
                <p className="text-xs text-gray-500">Enhanced account security</p>
              </div>
              <button className="text-sm text-blue-600 hover:text-blue-700">Enable</button>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium">Password</p>
                <p className="text-xs text-gray-500">Change your password</p>
              </div>
              <button className="text-sm text-blue-600 hover:text-blue-700">Update</button>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium">Data Export</p>
                <p className="text-xs text-gray-500">Download your data</p>
              </div>
              <button className="text-sm text-blue-600 hover:text-blue-700">Export</button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 