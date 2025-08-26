// Advanced Variable Parser
// Implements the exact specification from VARIABLE_DEFINITION_EDITOR_PLAN.md Phase 1

import { AdvancedParseResult, ParsedVariable, ParseError, ParseWarning } from '../types';

export class AdvancedVariableParser {
  // Enhanced regex patterns as specified in the plan
  static patterns = {
    // Simple variables: {{name}}
    simple: /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g,
    
    // Nested variables: {{user.profile.firstName}}
    nested: /\{\{([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\}\}/g,
    
    // Array indexed: {{users[0].name}} or {{items[index].value}}
    arrayIndexed: /\{\{([a-zA-Z_][a-zA-Z0-9_]*(?:\[[a-zA-Z0-9_]+\])?(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\}\}/g,
    
    // Special characters in paths: {{user-data.profile.first_name}}
    specialChars: /\{\{([a-zA-Z_][a-zA-Z0-9_-]*(?:\.[a-zA-Z_][a-zA-Z0-9_-]*)*)\}\}/g,
    
    // Performance-optimized combined pattern
    combined: /\{\{([a-zA-Z_][a-zA-Z0-9_-]*(?:\[[a-zA-Z0-9_]+\])?(?:\.[a-zA-Z_][a-zA-Z0-9_-]*)*)\}\}/g
  };

  static parseAdvancedTemplate(template: string): AdvancedParseResult {
    const variables: ParsedVariable[] = [];
    const errors: ParseError[] = [];
    const warnings: ParseWarning[] = [];
    
    // Use single optimized regex pass for performance
    let match;
    const combinedPattern = new RegExp(AdvancedVariableParser.patterns.combined.source, 'g');
    
    while ((match = combinedPattern.exec(template)) !== null) {
      const fullMatch = match[0];
      const variablePath = match[1];
      const position = match.index;
      
      // Analyze variable structure
      const analysis = AdvancedVariableParser.analyzeVariableStructure(variablePath);
      
      if (analysis.isValid) {
        variables.push({
          name: analysis.baseName,
          fullPath: variablePath,
          type: analysis.type,
          depth: analysis.depth,
          position,
          isValid: true
        });
        
        // Add warnings for complex structures
        if (analysis.depth > 3) {
          warnings.push({
            type: 'DEEP_NESTING',
            message: `Variable "${variablePath}" has deep nesting (${analysis.depth} levels)`,
            position,
            suggestion: 'Consider flattening data structure for better performance'
          });
        }
        
        if (analysis.hasArrayIndexing && analysis.usesStringIndex) {
          warnings.push({
            type: 'DYNAMIC_INDEXING',
            message: `Variable "${variablePath}" uses dynamic array indexing`,
            position,
            suggestion: 'Ensure the index variable is defined and valid'
          });
        }
      } else {
        errors.push({
          type: 'INVALID_STRUCTURE',
          message: analysis.error || `Invalid variable structure: "${variablePath}"`,
          position,
          suggestion: 'Use alphanumeric characters, underscores, dots, and brackets only'
        });
      }
    }
    
    return { variables, errors, warnings };
  }

  static analyzeVariableStructure(path: string) {
    // Split path into components
    const parts = path.split('.');
    const baseName = parts[0];
    
    // Check for array indexing in base name
    const arrayMatch = baseName.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\[([a-zA-Z0-9_]+)\]$/);
    const hasArrayIndexing = !!arrayMatch;
    const usesStringIndex = arrayMatch ? !/^\d+$/.test(arrayMatch[2]) : false;
    
    // Determine type
    let type: 'simple' | 'nested' | 'array_indexed';
    if (hasArrayIndexing) {
      type = 'array_indexed';
    } else if (parts.length > 1) {
      type = 'nested';
    } else {
      type = 'simple';
    }
    
    // Validate each part
    const isValid = parts.every(part => {
      if (part.includes('[') && part.includes(']')) {
        // Validate array indexed part
        return /^[a-zA-Z_][a-zA-Z0-9_-]*\[[a-zA-Z0-9_]+\]$/.test(part);
      } else {
        // Validate simple part
        return /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(part);
      }
    });
    
    return {
      baseName: arrayMatch ? arrayMatch[1] : baseName,
      depth: parts.length,
      type,
      hasArrayIndexing,
      usesStringIndex,
      isValid,
      error: isValid ? null : 'Invalid characters in variable path'
    };
  }
}

// Handle edge cases as specified in the plan
export function handleTemplateEdgeCases(template: string): AdvancedParseResult {
  const errors: ParseError[] = [];
  const variables: string[] = [];
  
  // Handle malformed syntax
  const malformedPatterns = template.match(/\{\{[^}]*(?:\{|$)/g) || [];
  malformedPatterns.forEach((match) => {
    const position = template.indexOf(match);
    errors.push({
      type: 'MALFORMED_SYNTAX',
      message: 'Unclosed variable bracket',
      position,
      suggestion: 'Add closing }} to complete the variable'
    });
  });
  
  // Handle deeply nested variables (support dot notation)
  const nestedVariables = template.match(/\{\{([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g) || [];
  nestedVariables.forEach(match => {
    const variableName = match.slice(2, -2);
    if (variableName.includes('.') && variableName.split('.').length > 5) {
      errors.push({
        type: 'INVALID_NESTING',
        message: 'Variable nesting too deep (max 5 levels)',
        position: template.indexOf(match),
        suggestion: 'Consider flattening the data structure'
      });
    }
    variables.push(variableName);
  });
  
  // Handle special characters in variable names
  const specialCharPattern = /\{\{([^a-zA-Z0-9_.].*?)\}\}/g;
  let specialMatch;
  while ((specialMatch = specialCharPattern.exec(template)) !== null) {
    errors.push({
      type: 'SPECIAL_CHARS',
      message: 'Variable names can only contain letters, numbers, underscores, and dots',
      position: specialMatch.index,
      suggestion: 'Use alphanumeric characters and underscores only'
    });
  }
  
  // Handle empty variable names
  const emptyVariables = template.match(/\{\{\s*\}\}/g) || [];
  emptyVariables.forEach(match => {
    errors.push({
      type: 'EMPTY_NAME',
      message: 'Variable name cannot be empty',
      position: template.indexOf(match),
      suggestion: 'Provide a meaningful variable name'
    });
  });
  
  // Handle duplicate variable references
  const uniqueVariables = [...new Set(variables)];
  const duplicateCount = variables.length - uniqueVariables.length;
  if (duplicateCount > 0) {
    // This is informational, not an error
    console.info(`Template contains ${duplicateCount} duplicate variable references`);
  }
  
  return { 
    variables: uniqueVariables.map(name => ({
      name,
      fullPath: name,
      type: 'simple' as const,
      depth: 1,
      position: template.indexOf(`{{${name}}}`),
      isValid: true
    })), 
    errors, 
    warnings: [] 
  };
}

// Performance optimization for large templates
export class OptimizedTemplateParser {
  // Chunk-based parsing for very large templates
  static parseInChunks(template: string, chunkSize = 5000): AdvancedParseResult {
    if (template.length <= chunkSize) {
      return AdvancedVariableParser.parseAdvancedTemplate(template);
    }
    
    const results: AdvancedParseResult = { variables: [], errors: [], warnings: [] };
    let offset = 0;
    
    // Split into overlapping chunks to handle variables at boundaries
    while (offset < template.length) {
      const end = Math.min(offset + chunkSize, template.length);
      const chunk = template.slice(offset, end);
      
      // Find safe break point (avoid breaking within variables)
      const safeEnd = chunk.lastIndexOf('}}') + 2;
      const safeChunk = safeEnd > 0 ? chunk.slice(0, safeEnd) : chunk;
      
      const chunkResult = AdvancedVariableParser.parseAdvancedTemplate(safeChunk);
      
      // Adjust positions for global offset
      chunkResult.variables.forEach(v => v.position += offset);
      chunkResult.errors.forEach(e => e.position += offset);
      chunkResult.warnings.forEach(w => w.position += offset);
      
      results.variables.push(...chunkResult.variables);
      results.errors.push(...chunkResult.errors);
      results.warnings.push(...chunkResult.warnings);
      
      offset += safeEnd || chunkSize;
    }
    
    // Remove duplicates (from overlapping chunks)
    results.variables = results.variables.filter((v, i, arr) => 
      arr.findIndex(x => x.fullPath === v.fullPath && x.position === v.position) === i
    );
    
    return results;
  }
}