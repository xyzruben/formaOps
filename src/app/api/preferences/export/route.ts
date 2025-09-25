import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth/server';
import { prisma } from '../../../../lib/database/client';
import { handleApiError } from '../../../../lib/utils/error-handler';

/**
 * GET /api/preferences/export - Export user preferences as JSON
 */
export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireAuth();

    // Get user preferences
    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: user.id },
      select: {
        // AI Results Viewer Preferences
        defaultViewMode: true,
        outputFontSize: true,
        customFontSize: true,
        enableSyntaxHighlight: true,
        enableWordWrap: true,
        showTokenMetrics: true,
        showCostMetrics: true,
        showLatencyMetrics: true,
        enableAutoRefresh: true,
        defaultExportFormat: true,
        defaultCopyFormat: true,

        // Dashboard Preferences
        defaultLandingPage: true,
        executionsPerPage: true,
        executionsSortBy: true,
        executionsSortOrder: true,
        promptsViewMode: true,
        promptsPerPage: true,
        promptsSortBy: true,
        promptsSortOrder: true,
        sidebarCollapsed: true,

        // Display & Theme
        theme: true,
        primaryColor: true,
        layoutDensity: true,
        enableAnimations: true,

        // Notifications & Behavior
        enableDesktopNotifications: true,
        showDetailedErrors: true,
        enableConfirmationDialogs: true,
        enableAutoSave: true,

        // Privacy & Data
        dataRetentionDays: true,
        enableUsageAnalytics: true,
        defaultShareExpiration: true,
        includeMetadataInExports: true,
      },
    });

    if (!preferences) {
      return NextResponse.json(
        {
          error: 'No preferences found',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Create export data with metadata
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exportedBy: user.email,
      preferences,
    };

    // Return as downloadable JSON file
    const response = NextResponse.json(exportData);
    response.headers.set(
      'Content-Disposition',
      `attachment; filename="formaops-preferences-${user.id.slice(-8)}-${new Date().toISOString().split('T')[0]}.json"`
    );
    response.headers.set('Content-Type', 'application/json');

    return response;
  } catch (error) {
    const apiError = handleApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
}
