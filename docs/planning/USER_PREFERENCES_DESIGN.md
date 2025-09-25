# User Preferences System Design

## Overview

The User Preferences System allows users to customize their experience across the AI Results Viewer, execution dashboards, and general application behavior. This system provides persistent, user-specific settings that enhance productivity and user satisfaction.

## Core Preference Categories

### 1. AI Results Viewer Preferences

- **Default View Mode**: Output, Metrics, or Raw view as default tab
- **Output Format**: Text wrap, syntax highlighting, font size
- **Metrics Display**: Show/hide specific metrics (tokens, cost, latency)
- **Auto-refresh**: Enable/disable real-time updates for running executions
- **Export Defaults**: Default export format (TXT, JSON, HTML, CSV)
- **Copy Format**: Default copy format (plain or formatted)

### 2. Dashboard & Navigation Preferences

- **Default Landing Page**: Dashboard, Executions, or Prompts
- **Execution List**: Items per page, default sorting, column visibility
- **Prompt List**: Grid vs list view, items per page, sorting preferences
- **Sidebar**: Collapsed/expanded by default, hide sections

### 3. Display & Theme Preferences

- **Theme**: Light, Dark, or System
- **Color Scheme**: Primary accent color selection
- **Density**: Compact, comfortable, or spacious layout
- **Font Size**: Small, medium, large, or custom
- **Animations**: Enable/disable UI animations and transitions

### 4. Notification & Behavior Preferences

- **Execution Notifications**: Desktop notifications for completion
- **Error Handling**: Show detailed errors or simplified messages
- **Confirmation Dialogs**: Enable/disable for destructive actions
- **Auto-save**: Auto-save prompt drafts, execution settings

### 5. Privacy & Data Preferences

- **Data Retention**: How long to keep execution history
- **Usage Analytics**: Opt-in/out of anonymous usage tracking
- **Sharing Defaults**: Default sharing permissions and expiration
- **Export Metadata**: Include/exclude metadata in exports by default

## Database Schema

```prisma
model UserPreferences {
  id        String   @id @default(uuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // AI Results Viewer Preferences
  defaultViewMode        String   @default("output") // "output" | "metrics" | "raw"
  outputFontSize         String   @default("medium") // "small" | "medium" | "large" | "custom"
  customFontSize         Int?     // Custom font size in px
  enableSyntaxHighlight  Boolean  @default(true)
  enableWordWrap         Boolean  @default(true)
  showTokenMetrics       Boolean  @default(true)
  showCostMetrics        Boolean  @default(true)
  showLatencyMetrics     Boolean  @default(true)
  enableAutoRefresh      Boolean  @default(true)
  defaultExportFormat    String   @default("txt") // "txt" | "json" | "html" | "csv"
  defaultCopyFormat      String   @default("formatted") // "plain" | "formatted"

  // Dashboard Preferences
  defaultLandingPage     String   @default("dashboard") // "dashboard" | "executions" | "prompts"
  executionsPerPage      Int      @default(20)
  executionsSortBy       String   @default("createdAt") // "createdAt" | "status" | "costUsd"
  executionsSortOrder    String   @default("desc") // "asc" | "desc"
  promptsViewMode        String   @default("list") // "list" | "grid"
  promptsPerPage         Int      @default(20)
  promptsSortBy          String   @default("updatedAt")
  promptsSortOrder       String   @default("desc")
  sidebarCollapsed       Boolean  @default(false)

  // Display & Theme
  theme                  String   @default("system") // "light" | "dark" | "system"
  primaryColor           String   @default("blue") // "blue" | "green" | "purple" | "red" | "orange"
  layoutDensity          String   @default("comfortable") // "compact" | "comfortable" | "spacious"
  enableAnimations       Boolean  @default(true)

  // Notifications & Behavior
  enableDesktopNotifications Boolean @default(false)
  showDetailedErrors         Boolean @default(true)
  enableConfirmationDialogs  Boolean @default(true)
  enableAutoSave             Boolean @default(true)

  // Privacy & Data
  dataRetentionDays      Int?     // null = keep forever
  enableUsageAnalytics   Boolean  @default(false)
  defaultShareExpiration Int      @default(168) // hours
  includeMetadataInExports Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("user_preferences")
}
```

## API Endpoints Design

### GET /api/preferences

Get current user's preferences with defaults for any missing values.

**Response:**

```typescript
{
  success: true,
  data: {
    preferences: UserPreferencesResponse,
    isDefault: boolean // true if using system defaults
  }
}
```

### PUT /api/preferences

Update user preferences (partial updates supported).

**Request:**

```typescript
{
  defaultViewMode?: "output" | "metrics" | "raw",
  theme?: "light" | "dark" | "system",
  // ... other preference fields
}
```

### POST /api/preferences/reset

Reset all preferences to system defaults.

### GET /api/preferences/export

Export user preferences as JSON file for backup/sharing.

## React Context & Hooks

### PreferencesContext

```typescript
interface PreferencesContextValue {
  preferences: UserPreferences;
  isLoading: boolean;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  resetPreferences: () => Promise<void>;
  exportPreferences: () => void;
  importPreferences: (preferences: UserPreferences) => Promise<void>;
}
```

### usePreferences Hook

```typescript
const { preferences, updatePreferences, resetPreferences, isLoading } =
  usePreferences();
```

### Specialized Hooks

- `useTheme()` - Theme-specific utilities
- `useDisplayPreferences()` - Layout and display settings
- `useAIResultsPreferences()` - AI Results Viewer specific settings

## UI Components

### 1. Settings Panel (`/settings`)

- Tabbed interface with categories
- Real-time preview of changes
- Import/Export functionality
- Reset to defaults option

### 2. Quick Settings Dropdown

- Header dropdown for common settings
- Theme toggle, density, font size
- Contextual preferences based on current page

### 3. Preference-Aware Components

- AI Results Viewer respects display preferences
- Execution lists use pagination/sorting preferences
- Navigation reflects landing page preference

## Implementation Strategy

### Phase 1: Core Infrastructure

1. Database schema and migrations
2. API endpoints with validation
3. React context and basic hooks
4. Default preference system

### Phase 2: AI Results Viewer Integration

1. Preference-aware display options
2. Export format defaults
3. View mode persistence
4. Real-time preference updates

### Phase 3: Dashboard Customization

1. Layout density options
2. Pagination and sorting preferences
3. Column visibility controls
4. Landing page customization

### Phase 4: Advanced Features

1. Theme system with custom colors
2. Import/Export preferences
3. Preference profiles/presets
4. Advanced notification settings

## Technical Considerations

### Performance

- Cache preferences in React context
- Debounce preference updates
- Use optimistic updates for better UX
- Lazy load preference panels

### Validation

- Zod schemas for API validation
- TypeScript interfaces for type safety
- Runtime validation for preference values
- Fallback to defaults for invalid preferences

### Security

- User can only access their own preferences
- Validate all preference values on server
- Sanitize custom values (font sizes, colors)
- Rate limit preference update requests

### Accessibility

- High contrast theme option
- Font size accessibility
- Keyboard navigation for settings
- Screen reader friendly labels

## Testing Strategy

### Unit Tests

- Preference validation logic
- Default value merging
- Update and reset functions
- Hook behavior

### Integration Tests

- API endpoints with authentication
- Database operations
- Preference persistence across sessions
- Import/export functionality

### E2E Tests

- Settings panel workflows
- Preference application across pages
- Theme switching
- Real-time updates

## Migration Strategy

### Existing Users

- Create default preferences on first access
- Migrate any existing localStorage settings
- Graceful handling of missing preferences
- Backward compatibility during transition

### Data Migration

```sql
-- Create default preferences for existing users
INSERT INTO user_preferences (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM user_preferences);
```

This comprehensive user preferences system will significantly enhance the user experience by allowing personalization of the AI Results Viewer and overall application behavior while maintaining performance and security.
