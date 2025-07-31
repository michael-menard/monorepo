# Page snapshot

```yaml
- navigation:
  - link "M MOC Builder":
    - /url: /
  - link "Sign In":
    - /url: /auth/login
    - button "Sign In"
  - link "Sign Up":
    - /url: /auth/signup
    - button "Sign Up"
- main:
  - heading "Create Account" [level=3]
  - paragraph: Join us to start building amazing MOCs
  - text: Full Name
  - img
  - textbox "Full Name": E2E Test User
  - text: Email
  - img
  - textbox "Email": e2e-test-gyou887cgmk@example.com
  - text: Password
  - img
  - textbox "Password": TestPassword123!
  - paragraph: "Password strength: Strong (minimum 8 characters)"
  - text: Confirm Password
  - img
  - textbox "Confirm Password": TestPassword123!
  - button [disabled]
  - text: Already have an account?
  - button "Sign in"
  - button "Open TanStack Router Devtools":
    - img
    - img
    - text: "- TanStack Router"
  - button "Open Tanstack query devtools":
    - img
```