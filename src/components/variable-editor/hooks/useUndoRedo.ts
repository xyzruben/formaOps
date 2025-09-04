// Undo/Redo Hook
// Implements Phase 2 undo/redo system from VARIABLE_DEFINITION_EDITOR_PLAN.md

import { useState, useCallback, useRef, useEffect } from 'react';
import { VariableDefinition } from '../types';
import { VariableHistoryManager } from '../utils/VariableHistoryManager';

export const useUndoRedo = (
  initialVariables: VariableDefinition[]
): {
  pushToHistory: (variables: VariableDefinition[], action: string) => void;
  undo: () => VariableDefinition[] | null;
  redo: () => VariableDefinition[] | null;
  canUndo: boolean;
  canRedo: boolean;
  handleKeyDown: (event: KeyboardEvent) => void;
  getCurrentState: () => VariableDefinition[];
} => {
  const historyManager = useRef(new VariableHistoryManager(initialVariables));
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Update undo/redo availability
  const updateUndoRedoState = useCallback(() => {
    setCanUndo(historyManager.current.canUndo());
    setCanRedo(historyManager.current.canRedo());
  }, []);

  // Add state to history
  const pushToHistory = useCallback(
    (variables: VariableDefinition[], action: string) => {
      historyManager.current.pushState(variables, action);
      updateUndoRedoState();
    },
    [updateUndoRedoState]
  );

  // Undo action
  const undo = useCallback((): VariableDefinition[] | null => {
    const previousState = historyManager.current.undo();
    updateUndoRedoState();
    return previousState?.variables || null;
  }, [updateUndoRedoState]);

  // Redo action
  const redo = useCallback((): VariableDefinition[] | null => {
    const nextState = historyManager.current.redo();
    updateUndoRedoState();
    return nextState?.variables || null;
  }, [updateUndoRedoState]);

  // Keyboard event handler
  const handleKeyDown = useCallback(
    (event: KeyboardEvent): void => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'z':
            if (event.shiftKey && canRedo) {
              event.preventDefault();
              redo();
            } else if (!event.shiftKey && canUndo) {
              event.preventDefault();
              undo();
            }
            break;
          case 'y':
            if (canRedo) {
              event.preventDefault();
              redo();
            }
            break;
        }
      }
    },
    [canUndo, canRedo, undo, redo]
  );

  // Attach keyboard listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return (): void => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Get current state
  const getCurrentState = useCallback((): VariableDefinition[] => {
    return historyManager.current.getCurrentState().variables;
  }, []);

  return {
    pushToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    getCurrentState,
    handleKeyDown,
  };
};
