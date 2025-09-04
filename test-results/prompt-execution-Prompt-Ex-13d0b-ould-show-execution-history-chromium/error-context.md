# Page snapshot

```yaml
- main:
  - heading "Welcome to FormaOps" [level=1]
  - paragraph: Welcome back, test@example.com!
  - button "Logout"
  - heading "My Prompts" [level=2]
  - button "Create Prompt"
  - heading "Greeting Generator" [level=3]
  - text: PUBLISHED
  - paragraph: Generate personalized greetings
  - button "Execute"
  - button "Edit"
  - button "Delete"
  - 'heading "Execute Prompt: Greeting Generator" [level=3]'
  - text: tone *
  - textbox "tone"
  - text: name *
  - textbox "name"
  - text: company *
  - textbox "company"
  - button "Execute Prompt"
  - button "Cancel"
- alert
```