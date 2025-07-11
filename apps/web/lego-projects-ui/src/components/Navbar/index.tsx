import * as React from "react"
import { Bell, MessageCircle, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAppSelector } from "@/store/hooks"

export function Navbar() {
  const { isAuthenticated, user } = useAppSelector((state) => state.user);

  return (
    <div className="flex items-center justify-between w-full">
      {/* Logo */}
      <div className="flex items-center">
        <h1 className="text-xl font-bold text-indigo-700">Lego Projects</h1>
      </div>

      {/* Navigation Links - Only show for authenticated users */}
      {isAuthenticated && (
        <nav className="flex items-center space-x-6">
          <a href="/instructions" className="text-gray-700 hover:text-indigo-700 font-medium">
            Instructions
          </a>
          <a href="/inspiration" className="text-gray-700 hover:text-indigo-700 font-medium">
            Inspiration
          </a>
          <a href="/profile" className="text-gray-700 hover:text-indigo-700 font-medium">
            Profile
          </a>
        </nav>
      )}

      {/* Right side - Avatar/Notifications for authenticated, Login/Signup for unauthenticated */}
      <div className="flex items-center space-x-4">
        {isAuthenticated ? (
          <>
            {/* Notifications */}
            <button className="p-2 text-gray-600 hover:text-indigo-700 transition-colors">
              <Bell className="h-5 w-5" />
            </button>
            
            {/* Messages */}
            <button className="p-2 text-gray-600 hover:text-indigo-700 transition-colors">
              <MessageCircle className="h-5 w-5" />
            </button>
            
            {/* User Avatar with Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="https://github.com/shadcn.png" alt={user?.name || "User"} />
                    <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          /* Unauthenticated - Show Login/Signup links */
          <div className="flex items-center space-x-4">
            <a href="/auth/login" className="text-gray-700 hover:text-indigo-700 font-medium">
              Login
            </a>
            <a href="/auth/signup" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors">
              Sign Up
            </a>
          </div>
        )}
      </div>
    </div>
  )
} 