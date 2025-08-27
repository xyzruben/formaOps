// Accessibility Hook
// Implements Phase 3 accessibility features from VARIABLE_DEFINITION_EDITOR_PLAN.md

import { useState, useCallback, useEffect, useRef } from 'react';
import { VariableDefinition } from '../types';

// High contrast mode support
export const HighContrastStyles = {
  detectHighContrast: (): boolean => {
    return (
      window.matchMedia('(prefers-contrast: high)').matches ||
      window.matchMedia('(-ms-high-contrast: active)').matches
    );
  },

  applyHighContrastStyles: () => ({
    '--variable-border-color': 'currentColor',
    '--variable-bg-color': 'transparent',
    '--variable-text-color': 'currentColor',
    '--variable-focus-color': 'Highlight',
    '--variable-focus-bg': 'HighlightText',
  }),
};

// Main accessibility hook
export const useAccessibility = (variables: VariableDefinition[]) => {
  const [announcementText, setAnnouncementText] = useState('');
  const [focusedVariableIndex, setFocusedVariableIndex] = useState(-1);
  const [highContrastMode, setHighContrastMode] = useState(false);
  const announcementTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detect high contrast mode
  useEffect(() => {
    const updateHighContrast = () => {
      setHighContrastMode(HighContrastStyles.detectHighContrast());
    };

    updateHighContrast();

    // Listen for contrast preference changes
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    mediaQuery.addListener(updateHighContrast);

    return () => {
      mediaQuery.removeListener(updateHighContrast);
    };
  }, []);

  // Screen reader announcements
  const announceVariableDetection = useCallback((count: number) => {
    const message =
      count === 1
        ? '1 variable detected in template'
        : `${count} variables detected in template`;

    setAnnouncementText(message);

    // Clear announcement after 3 seconds
    if (announcementTimeoutRef.current) {
      clearTimeout(announcementTimeoutRef.current);
    }
    announcementTimeoutRef.current = setTimeout(() => {
      setAnnouncementText('');
    }, 3000);
  }, []);

  const announceVariableUpdate = useCallback(
    (variableName: string, property: string) => {
      const message = `Updated ${property} for variable ${variableName}`;
      setAnnouncementText(message);

      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current);
      }
      announcementTimeoutRef.current = setTimeout(() => {
        setAnnouncementText('');
      }, 3000);
    },
    []
  );

  const announceTypeConversion = useCallback(
    (variableName: string, fromType: string, toType: string) => {
      const message = `Converted ${variableName} from ${fromType} to ${toType}`;
      setAnnouncementText(message);

      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current);
      }
      announcementTimeoutRef.current = setTimeout(() => {
        setAnnouncementText('');
      }, 3000);
    },
    []
  );

  const announceHistoryAction = useCallback(
    (action: 'undo' | 'redo', description: string) => {
      const message = `${action === 'undo' ? 'Undid' : 'Redid'}: ${description}`;
      setAnnouncementText(message);

      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current);
      }
      announcementTimeoutRef.current = setTimeout(() => {
        setAnnouncementText('');
      }, 3000);
    },
    []
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setFocusedVariableIndex(prev =>
            Math.min(prev + 1, variables.length - 1)
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusedVariableIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (focusedVariableIndex >= 0) {
            // This will be handled by the parent component
            return { action: 'edit', index: focusedVariableIndex };
          }
          break;
        case 'Escape':
          // Exit edit mode or clear focus
          setFocusedVariableIndex(-1);
          break;
        case 'd':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            if (focusedVariableIndex >= 0) {
              return { action: 'duplicate', index: focusedVariableIndex };
            }
          }
          break;
        case 'Delete':
          if (focusedVariableIndex >= 0) {
            event.preventDefault();
            return { action: 'delete', index: focusedVariableIndex };
          }
          break;
      }
      return null;
    },
    [focusedVariableIndex, variables.length]
  );

  // Focus management
  const setFocusedVariable = useCallback(
    (index: number) => {
      setFocusedVariableIndex(
        Math.max(-1, Math.min(index, variables.length - 1))
      );
    },
    [variables.length]
  );

  const clearFocus = useCallback(() => {
    setFocusedVariableIndex(-1);
  }, []);

  // Enhanced ARIA props generator
  const getVariableAriaProps = useCallback(
    (variable: VariableDefinition, index: number) => ({
      role: 'row',
      'aria-rowindex': index + 1,
      'aria-selected': focusedVariableIndex === index,
      'aria-label': `Variable ${variable.name}, type ${variable.type}, ${variable.required ? 'required' : 'optional'}`,
      'aria-describedby': `var-desc-${index}`,
      tabIndex: focusedVariableIndex === index ? 0 : -1,
    }),
    [focusedVariableIndex]
  );

  const getTableAriaProps = useCallback(
    () => ({
      role: 'table',
      'aria-label': 'Variable Configuration',
      'aria-describedby': 'table-help',
      'aria-rowcount': variables.length + 1, // +1 for header
      'aria-colcount': 5,
    }),
    [variables.length]
  );

  const getAnnouncementAriaProps = useCallback(
    () => ({
      'aria-live': 'polite' as const,
      'aria-atomic': true,
      className: 'sr-only',
    }),
    []
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Announcements
    announcementText,
    announceVariableDetection,
    announceVariableUpdate,
    announceTypeConversion,
    announceHistoryAction,

    // Navigation
    focusedVariableIndex,
    handleKeyDown,
    setFocusedVariable,
    clearFocus,

    // ARIA helpers
    getVariableAriaProps,
    getTableAriaProps,
    getAnnouncementAriaProps,

    // High contrast
    highContrastMode,
    highContrastStyles: highContrastMode
      ? HighContrastStyles.applyHighContrastStyles()
      : {},
  };
};
