# Page snapshot

```yaml
- navigation:
  - link "M MOC Builder Beta":
    - /url: /
  - link "Sign In":
    - /url: /auth/login
    - button "Sign In"
  - link "Sign Up":
    - /url: /auth/signup
    - button "Sign Up"
- main:
  - heading "Set New Password" [level=3]
  - paragraph: Enter your new password below
  - text: New Password
  - img
  - textbox "New Password": ValidPassword123!
  - text: Confirm New Password
  - img
  - textbox "Confirm New Password": ValidPassword123!
  - paragraph: Invalid or expired reset token
  - button "Update Password"
  - button "Open TanStack Router Devtools":
    - img
    - img
    - text: "- TanStack Router"
  - button "Open Tanstack query devtools":
    - img
```