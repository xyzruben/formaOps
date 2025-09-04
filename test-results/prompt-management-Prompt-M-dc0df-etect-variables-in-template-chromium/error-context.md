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
  - heading "Create New Prompt" [level=3]
  - text: Prompt Name
  - textbox "Prompt Name": Variable Test
  - text: Template
  - textbox "Enter your prompt template here...": "Hello {{name}}, you are {{age}} years old"
  - button "Create"
  - button "Cancel"
- alert
```