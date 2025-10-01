-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "defaultViewMode" TEXT NOT NULL DEFAULT 'output',
    "outputFontSize" TEXT NOT NULL DEFAULT 'medium',
    "customFontSize" INTEGER,
    "enableSyntaxHighlight" BOOLEAN NOT NULL DEFAULT true,
    "enableWordWrap" BOOLEAN NOT NULL DEFAULT true,
    "showTokenMetrics" BOOLEAN NOT NULL DEFAULT true,
    "showCostMetrics" BOOLEAN NOT NULL DEFAULT true,
    "showLatencyMetrics" BOOLEAN NOT NULL DEFAULT true,
    "enableAutoRefresh" BOOLEAN NOT NULL DEFAULT true,
    "defaultExportFormat" TEXT NOT NULL DEFAULT 'txt',
    "defaultCopyFormat" TEXT NOT NULL DEFAULT 'formatted',
    "defaultLandingPage" TEXT NOT NULL DEFAULT 'dashboard',
    "executionsPerPage" INTEGER NOT NULL DEFAULT 20,
    "executionsSortBy" TEXT NOT NULL DEFAULT 'createdAt',
    "executionsSortOrder" TEXT NOT NULL DEFAULT 'desc',
    "promptsViewMode" TEXT NOT NULL DEFAULT 'list',
    "promptsPerPage" INTEGER NOT NULL DEFAULT 20,
    "promptsSortBy" TEXT NOT NULL DEFAULT 'updatedAt',
    "promptsSortOrder" TEXT NOT NULL DEFAULT 'desc',
    "sidebarCollapsed" BOOLEAN NOT NULL DEFAULT false,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "primaryColor" TEXT NOT NULL DEFAULT 'blue',
    "layoutDensity" TEXT NOT NULL DEFAULT 'comfortable',
    "enableAnimations" BOOLEAN NOT NULL DEFAULT true,
    "enableDesktopNotifications" BOOLEAN NOT NULL DEFAULT false,
    "showDetailedErrors" BOOLEAN NOT NULL DEFAULT true,
    "enableConfirmationDialogs" BOOLEAN NOT NULL DEFAULT true,
    "enableAutoSave" BOOLEAN NOT NULL DEFAULT true,
    "dataRetentionDays" INTEGER,
    "enableUsageAnalytics" BOOLEAN NOT NULL DEFAULT false,
    "defaultShareExpiration" INTEGER NOT NULL DEFAULT 168,
    "includeMetadataInExports" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- CreateIndex
CREATE INDEX "user_preferences_userId_idx" ON "user_preferences"("userId");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
