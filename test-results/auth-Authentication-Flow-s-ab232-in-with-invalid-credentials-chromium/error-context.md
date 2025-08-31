# Page snapshot

```yaml
- dialog "Sign In to FormaOps":
    - heading "Sign In to FormaOps" [level=2]
    - paragraph: Enter your credentials to access your account
    - textbox "Email": test@example.com
    - textbox "Password": wrongpassword
    - paragraph: Internal server error
    - button "Sign In"
    - button "Close":
        - img
        - text: Close
```
