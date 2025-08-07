import { prisma } from '../database/client';
import type { Prompt, PromptVersion } from '@prisma/client';
import type { VariableDefinition } from '@/types';

export interface VersionInfo {
  version: number;
  template: string;
  variables: VariableDefinition[];
  changeLog?: string;
  createdAt: Date;
}

export interface VersionComparison {
  oldVersion: VersionInfo;
  newVersion: VersionInfo;
  changes: {
    templateChanged: boolean;
    variablesChanged: boolean;
    templateDiff?: {
      additions: string[];
      deletions: string[];
      modifications: string[];
    };
    variablesDiff?: {
      added: VariableDefinition[];
      removed: VariableDefinition[];
      modified: Array<{
        name: string;
        oldDefinition: VariableDefinition;
        newDefinition: VariableDefinition;
      }>;
    };
  };
}

export class PromptVersionManager {
  public async createVersion(
    promptId: string,
    userId: string,
    updates: {
      template?: string;
      variables?: VariableDefinition[];
      changeLog?: string;
    }
  ): Promise<{
    prompt: Prompt;
    newVersion: PromptVersion;
    versionNumber: number;
  }> {
    // Get current prompt
    const currentPrompt = await prisma.prompt.findFirst({
      where: { id: promptId, userId },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });

    if (!currentPrompt) {
      throw new Error('Prompt not found');
    }

    // Check if there are actually changes
    const hasTemplateChanges = updates.template && updates.template !== currentPrompt.template;
    const hasVariableChanges = updates.variables && 
      JSON.stringify(updates.variables) !== JSON.stringify(currentPrompt.variables);

    if (!hasTemplateChanges && !hasVariableChanges) {
      throw new Error('No changes detected');
    }

    const newVersionNumber = currentPrompt.version + 1;

    // Create version record for current state before updating
    await prisma.promptVersion.create({
      data: {
        promptId,
        version: currentPrompt.version,
        template: currentPrompt.template,
        variables: currentPrompt.variables,
        changeLog: `Version ${currentPrompt.version} backup`,
      },
    });

    // Update prompt with new content
    const updatedPrompt = await prisma.prompt.update({
      where: { id: promptId },
      data: {
        template: updates.template || currentPrompt.template,
        variables: updates.variables || currentPrompt.variables,
        version: newVersionNumber,
        updatedAt: new Date(),
      },
    });

    // Create new version record
    const newVersion = await prisma.promptVersion.create({
      data: {
        promptId,
        version: newVersionNumber,
        template: updates.template || currentPrompt.template,
        variables: updates.variables || currentPrompt.variables,
        changeLog: updates.changeLog || `Updated to version ${newVersionNumber}`,
      },
    });

    return {
      prompt: updatedPrompt,
      newVersion,
      versionNumber: newVersionNumber,
    };
  }

  public async getVersionHistory(
    promptId: string,
    userId: string,
    limit = 20
  ): Promise<VersionInfo[]> {
    // Verify user owns the prompt
    const prompt = await prisma.prompt.findFirst({
      where: { id: promptId, userId },
    });

    if (!prompt) {
      throw new Error('Prompt not found');
    }

    const versions = await prisma.promptVersion.findMany({
      where: { promptId },
      orderBy: { version: 'desc' },
      take: limit,
    });

    // Include current version
    const allVersions: VersionInfo[] = [
      {
        version: prompt.version,
        template: prompt.template,
        variables: prompt.variables as VariableDefinition[],
        changeLog: 'Current version',
        createdAt: prompt.updatedAt,
      },
      ...versions.map(v => ({
        version: v.version,
        template: v.template,
        variables: v.variables as VariableDefinition[],
        changeLog: v.changeLog,
        createdAt: v.createdAt,
      })),
    ];

    // Remove duplicates and sort
    const uniqueVersions = allVersions.filter(
      (version, index, array) => 
        array.findIndex(v => v.version === version.version) === index
    );

    return uniqueVersions.sort((a, b) => b.version - a.version);
  }

  public async compareVersions(
    promptId: string,
    userId: string,
    oldVersion: number,
    newVersion: number
  ): Promise<VersionComparison> {
    const versions = await this.getVersionHistory(promptId, userId);
    
    const oldVersionInfo = versions.find(v => v.version === oldVersion);
    const newVersionInfo = versions.find(v => v.version === newVersion);

    if (!oldVersionInfo || !newVersionInfo) {
      throw new Error('Version not found');
    }

    const templateChanged = oldVersionInfo.template !== newVersionInfo.template;
    const variablesChanged = JSON.stringify(oldVersionInfo.variables) !== JSON.stringify(newVersionInfo.variables);

    let templateDiff;
    if (templateChanged) {
      templateDiff = this.generateTemplateDiff(oldVersionInfo.template, newVersionInfo.template);
    }

    let variablesDiff;
    if (variablesChanged) {
      variablesDiff = this.generateVariablesDiff(oldVersionInfo.variables, newVersionInfo.variables);
    }

    return {
      oldVersion: oldVersionInfo,
      newVersion: newVersionInfo,
      changes: {
        templateChanged,
        variablesChanged,
        templateDiff,
        variablesDiff,
      },
    };
  }

  public async rollbackToVersion(
    promptId: string,
    userId: string,
    targetVersion: number,
    changeLog?: string
  ): Promise<{
    prompt: Prompt;
    newVersion: PromptVersion;
  }> {
    const versions = await this.getVersionHistory(promptId, userId);
    const targetVersionInfo = versions.find(v => v.version === targetVersion);

    if (!targetVersionInfo) {
      throw new Error(`Version ${targetVersion} not found`);
    }

    const currentPrompt = await prisma.prompt.findFirst({
      where: { id: promptId, userId },
    });

    if (!currentPrompt) {
      throw new Error('Prompt not found');
    }

    // Create a new version with the rolled-back content
    return this.createVersion(promptId, userId, {
      template: targetVersionInfo.template,
      variables: targetVersionInfo.variables,
      changeLog: changeLog || `Rolled back to version ${targetVersion}`,
    });
  }

  public async deleteVersion(
    promptId: string,
    userId: string,
    versionNumber: number
  ): Promise<void> {
    // Verify user owns the prompt
    const prompt = await prisma.prompt.findFirst({
      where: { id: promptId, userId },
    });

    if (!prompt) {
      throw new Error('Prompt not found');
    }

    // Cannot delete current version
    if (versionNumber === prompt.version) {
      throw new Error('Cannot delete current version');
    }

    // Delete the version
    const result = await prisma.promptVersion.deleteMany({
      where: {
        promptId,
        version: versionNumber,
      },
    });

    if (result.count === 0) {
      throw new Error('Version not found');
    }
  }

  private generateTemplateDiff(oldTemplate: string, newTemplate: string): {
    additions: string[];
    deletions: string[];
    modifications: string[];
  } {
    const oldLines = oldTemplate.split('\n');
    const newLines = newTemplate.split('\n');

    const additions: string[] = [];
    const deletions: string[] = [];
    const modifications: string[] = [];

    // Simple line-by-line diff (basic implementation)
    const maxLines = Math.max(oldLines.length, newLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      if (oldLine === undefined && newLine !== undefined) {
        additions.push(`+${i + 1}: ${newLine}`);
      } else if (oldLine !== undefined && newLine === undefined) {
        deletions.push(`-${i + 1}: ${oldLine}`);
      } else if (oldLine !== newLine) {
        modifications.push(`~${i + 1}: "${oldLine}" → "${newLine}"`);
      }
    }

    return { additions, deletions, modifications };
  }

  private generateVariablesDiff(
    oldVariables: VariableDefinition[],
    newVariables: VariableDefinition[]
  ): {
    added: VariableDefinition[];
    removed: VariableDefinition[];
    modified: Array<{
      name: string;
      oldDefinition: VariableDefinition;
      newDefinition: VariableDefinition;
    }>;
  } {
    const added: VariableDefinition[] = [];
    const removed: VariableDefinition[] = [];
    const modified: Array<{
      name: string;
      oldDefinition: VariableDefinition;
      newDefinition: VariableDefinition;
    }> = [];

    const oldVarMap = new Map(oldVariables.map(v => [v.name, v]));
    const newVarMap = new Map(newVariables.map(v => [v.name, v]));

    // Find added variables
    for (const newVar of newVariables) {
      if (!oldVarMap.has(newVar.name)) {
        added.push(newVar);
      }
    }

    // Find removed variables
    for (const oldVar of oldVariables) {
      if (!newVarMap.has(oldVar.name)) {
        removed.push(oldVar);
      }
    }

    // Find modified variables
    for (const [name, newVar] of newVarMap) {
      const oldVar = oldVarMap.get(name);
      if (oldVar && JSON.stringify(oldVar) !== JSON.stringify(newVar)) {
        modified.push({
          name,
          oldDefinition: oldVar,
          newDefinition: newVar,
        });
      }
    }

    return { added, removed, modified };
  }
}

// Export utility functions for version management
export const promptVersions = {
  async getCurrentVersion(promptId: string, userId: string): Promise<VersionInfo | null> {
    const prompt = await prisma.prompt.findFirst({
      where: { id: promptId, userId },
    });

    if (!prompt) return null;

    return {
      version: prompt.version,
      template: prompt.template,
      variables: prompt.variables as VariableDefinition[],
      changeLog: 'Current version',
      createdAt: prompt.updatedAt,
    };
  },

  async getVersionStats(promptId: string, userId: string): Promise<{
    totalVersions: number;
    oldestVersion: Date;
    newestVersion: Date;
    averageTimeBetweenVersions: number; // in hours
  }> {
    const versions = await new PromptVersionManager().getVersionHistory(promptId, userId, 100);
    
    if (versions.length === 0) {
      return {
        totalVersions: 0,
        oldestVersion: new Date(),
        newestVersion: new Date(),
        averageTimeBetweenVersions: 0,
      };
    }

    const sortedVersions = versions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const oldestVersion = sortedVersions[0].createdAt;
    const newestVersion = sortedVersions[sortedVersions.length - 1].createdAt;
    
    const totalTimeMs = newestVersion.getTime() - oldestVersion.getTime();
    const averageTimeBetweenVersions = versions.length > 1 
      ? totalTimeMs / (versions.length - 1) / (1000 * 60 * 60) // Convert to hours
      : 0;

    return {
      totalVersions: versions.length,
      oldestVersion,
      newestVersion,
      averageTimeBetweenVersions,
    };
  },
};

// Singleton instance
export const promptVersionManager = new PromptVersionManager();