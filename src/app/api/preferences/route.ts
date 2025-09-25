import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '../../../lib/auth/server';
import { prisma } from '../../../lib/database/client';
import { handleApiError } from '../../../lib/utils/error-handler';

// Validation schemas for user preferences
const UserPreferencesUpdateSchema = z.object({
  // AI Results Viewer Preferences
  defaultViewMode: z.enum(['output', 'metrics', 'raw']).optional(),
  outputFontSize: z.enum(['small', 'medium', 'large', 'custom']).optional(),
  customFontSize: z.number().min(8).max(32).optional(),
  enableSyntaxHighlight: z.boolean().optional(),
  enableWordWrap: z.boolean().optional(),
  showTokenMetrics: z.boolean().optional(),
  showCostMetrics: z.boolean().optional(),
  showLatencyMetrics: z.boolean().optional(),
  enableAutoRefresh: z.boolean().optional(),
  defaultExportFormat: z.enum(['txt', 'json', 'html', 'csv']).optional(),
  defaultCopyFormat: z.enum(['plain', 'formatted']).optional(),

  // Dashboard Preferences
  defaultLandingPage: z.enum(['dashboard', 'executions', 'prompts']).optional(),
  executionsPerPage: z.number().min(5).max(100).optional(),
  executionsSortBy: z.enum(['createdAt', 'status', 'costUsd']).optional(),
  executionsSortOrder: z.enum(['asc', 'desc']).optional(),
  promptsViewMode: z.enum(['list', 'grid']).optional(),
  promptsPerPage: z.number().min(5).max(100).optional(),
  promptsSortBy: z.enum(['updatedAt', 'createdAt', 'name']).optional(),
  promptsSortOrder: z.enum(['asc', 'desc']).optional(),
  sidebarCollapsed: z.boolean().optional(),

  // Display & Theme
  theme: z.enum(['light', 'dark', 'system']).optional(),
  primaryColor: z.enum(['blue', 'green', 'purple', 'red', 'orange']).optional(),
  layoutDensity: z.enum(['compact', 'comfortable', 'spacious']).optional(),
  enableAnimations: z.boolean().optional(),

  // Notifications & Behavior
  enableDesktopNotifications: z.boolean().optional(),
  showDetailedErrors: z.boolean().optional(),
  enableConfirmationDialogs: z.boolean().optional(),
  enableAutoSave: z.boolean().optional(),

  // Privacy & Data
  dataRetentionDays: z.number().min(1).max(365).nullable().optional(),
  enableUsageAnalytics: z.boolean().optional(),
  defaultShareExpiration: z.number().min(1).max(8760).optional(), // 1 hour to 1 year
  includeMetadataInExports: z.boolean().optional(),
});

/**
 * GET /api/preferences - Get user preferences
 */
export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireAuth();

    // Try to get existing preferences
    let preferences = await prisma.userPreferences.findUnique({
      where: { userId: user.id },
    });

    let isDefault = false;

    // If no preferences exist, create defaults
    if (!preferences) {
      preferences = await prisma.userPreferences.create({
        data: { userId: user.id },
      });
      isDefault = true;
    }

    return NextResponse.json({
      success: true,
      data: {
        preferences,
        isDefault,
      },
    });
  } catch (error) {
    const apiError = handleApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
}

/**
 * PUT /api/preferences - Update user preferences
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    const body = await request.json();

    // Validate request body
    const updates = UserPreferencesUpdateSchema.parse(body);

    // Update or create preferences
    const preferences = await prisma.userPreferences.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        ...updates,
      },
      update: updates,
    });

    return NextResponse.json({
      success: true,
      data: {
        preferences,
        message: 'Preferences updated successfully',
      },
    });
  } catch (error) {
    const apiError = handleApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
}

/**
 * DELETE /api/preferences - Reset preferences to defaults
 */
export async function DELETE(): Promise<NextResponse> {
  try {
    const user = await requireAuth();

    // Delete existing preferences (will recreate with defaults on next GET)
    await prisma.userPreferences.deleteMany({
      where: { userId: user.id },
    });

    // Create new default preferences
    const preferences = await prisma.userPreferences.create({
      data: { userId: user.id },
    });

    return NextResponse.json({
      success: true,
      data: {
        preferences,
        message: 'Preferences reset to defaults successfully',
      },
    });
  } catch (error) {
    const apiError = handleApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
}
