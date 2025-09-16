# Page snapshot

```yaml
- dialog "Welcome to FormaOps":
  - heading "Welcome to FormaOps" [level=2]
  - paragraph: Sign in to your account or create a new one to get started
  - button "Sign In"
  - button "Create Account"
  - heading "Sign In to FormaOps" [level=3]
  - paragraph: Enter your credentials to access your account
  - textbox "Email": user@test.com
  - textbox "Password": password123
  - paragraph: Invalid credentials
  - button "Sign In"
  - button "Close":
    - img
    - text: Close
```