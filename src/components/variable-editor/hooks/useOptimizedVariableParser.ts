// Optimized Variable Parser Hook
// Implements Phase 3 performance optimization from VARIABLE_DEFINITION_EDITOR_PLAN.md

import { useState, useMemo, useEffect, useCallback } from 'react';
import { AdvancedParseResult } from '../types';
import {
  AdvancedVariableParser,
  OptimizedTemplateParser,
  handleTemplateEdgeCases,
} from '../parsers/AdvancedVariableParser';

// Debounce utility hook
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// Performance monitoring
export const VariablePerformanceMonitor = {
  // Target performance benchmarks
  PARSE_TIME_TARGET: 50, // ms
  RENDER_TIME_TARGET: 100, // ms
  MEMORY_THRESHOLD: 10, // MB

  measureParseTime: (template: string): number => {
    const start = performance.now();
    AdvancedVariableParser.parseAdvancedTemplate(template);
    const end = performance.now();
    return end - start;
  },

  trackMemoryUsage: (): number => {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    }
    return 0;
  },

  shouldOptimize: (parseTime: number, memoryUsage: number): boolean => {
    return (
      parseTime > VariablePerformanceMonitor.PARSE_TIME_TARGET ||
      memoryUsage > VariablePerformanceMonitor.MEMORY_THRESHOLD
    );
  },
};

// Main optimized parser hook
export const useOptimizedVariableParser = (template: string) => {
  // Debounce template changes to prevent excessive parsing
  const debouncedTemplate = useDebounce(template, 300);

  // Lazy loading for large variable lists
  const [visibleVariableCount, setVisibleVariableCount] = useState(20);

  // Memoize parsing results to avoid redundant computation
  const parsedVariables = useMemo(() => {
    if (!debouncedTemplate) return { variables: [], errors: [], warnings: [] };

    // Performance monitoring
    const parseStartTime = performance.now();
    let result: AdvancedParseResult;

    // Early return for very long templates
    if (debouncedTemplate.length > 10000) {
      return {
        variables: [],
        errors: [
          {
            type: 'TEMPLATE_TOO_LONG' as const,
            message: 'Template exceeds maximum length of 10,000 characters',
            position: 10000,
            suggestion:
              'Consider breaking down your template into smaller parts',
          },
        ],
        warnings: [],
      };
    }

    // Use optimized parsing strategies based on template size
    if (debouncedTemplate.length > 5000) {
      result = OptimizedTemplateParser.parseInChunks(debouncedTemplate);
    } else {
      // Combine advanced parsing with edge case handling
      const advancedResult =
        AdvancedVariableParser.parseAdvancedTemplate(debouncedTemplate);
      const edgeCaseResult = handleTemplateEdgeCases(debouncedTemplate);

      // Merge results
      const mergedVariables = [...advancedResult.variables];
      const mergedErrors = [...advancedResult.errors, ...edgeCaseResult.errors];
      const mergedWarnings = [
        ...advancedResult.warnings,
        ...edgeCaseResult.warnings,
      ];

      // Remove duplicate errors
      const uniqueErrors = mergedErrors.filter(
        (error, index, arr) =>
          arr.findIndex(
            e => e.position === error.position && e.type === error.type
          ) === index
      );

      result = {
        variables: mergedVariables,
        errors: uniqueErrors,
        warnings: mergedWarnings,
      };
    }

    // Performance tracking
    const parseTime = performance.now() - parseStartTime;
    const memoryUsage = VariablePerformanceMonitor.trackMemoryUsage();

    // Performance tracking completed (debug logging removed for production)

    return result;
  }, [debouncedTemplate]);

  // Lazy loading for large variable lists
  const visibleVariables = useMemo(
    () => parsedVariables.variables.slice(0, visibleVariableCount),
    [parsedVariables.variables, visibleVariableCount]
  );

  const loadMoreVariables = useCallback(() => {
    setVisibleVariableCount(prev => prev + 20);
  }, []);

  const resetVisibleCount = useCallback(() => {
    setVisibleVariableCount(20);
  }, []);

  return {
    variables: visibleVariables,
    allVariables: parsedVariables.variables,
    errors: parsedVariables.errors,
    warnings: parsedVariables.warnings,
    hasMore: parsedVariables.variables.length > visibleVariableCount,
    isDebouncing: template !== debouncedTemplate,
    loadMore: loadMoreVariables,
    resetVisibleCount,
  };
};
