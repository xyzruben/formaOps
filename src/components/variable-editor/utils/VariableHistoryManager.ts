// Variable History Manager
// Implements Phase 2 undo/redo system from VARIABLE_DEFINITION_EDITOR_PLAN.md

import { VariableDefinition, HistoryState, UndoRedoState } from '../types';

export class VariableHistoryManager {
  private maxHistorySize = 50;
  private state: UndoRedoState;
  
  constructor(initialVariables: VariableDefinition[]) {
    this.state = {
      past: [],
      present: {
        variables: initialVariables,
        timestamp: Date.now(),
        action: 'initial'
      },
      future: []
    };
  }

  // Add new state to history
  pushState(variables: VariableDefinition[], action: string): void {
    const newState: HistoryState = {
      variables: JSON.parse(JSON.stringify(variables)), // Deep clone
      timestamp: Date.now(),
      action
    };

    // Don't add if no changes
    if (this.deepEqual(this.state.present.variables, variables)) {
      return;
    }

    this.state = {
      past: [...this.state.past, this.state.present].slice(-this.maxHistorySize),
      present: newState,
      future: [] // Clear future when new action is performed
    };
  }

  // Undo last action
  undo(): HistoryState | null {
    if (this.state.past.length === 0) {
      return null;
    }

    const previous = this.state.past[this.state.past.length - 1];
    const newPast = this.state.past.slice(0, -1);

    this.state = {
      past: newPast,
      present: previous,
      future: [this.state.present, ...this.state.future]
    };

    return this.state.present;
  }

  // Redo next action
  redo(): HistoryState | null {
    if (this.state.future.length === 0) {
      return null;
    }

    const next = this.state.future[0];
    const newFuture = this.state.future.slice(1);

    this.state = {
      past: [...this.state.past, this.state.present],
      present: next,
      future: newFuture
    };

    return this.state.present;
  }

  // Get current state
  getCurrentState(): HistoryState {
    return this.state.present;
  }

  // Check if undo is possible
  canUndo(): boolean {
    return this.state.past.length > 0;
  }

  // Check if redo is possible
  canRedo(): boolean {
    return this.state.future.length > 0;
  }

  // Get history summary for debugging
  getHistorySummary(): { past: number; present: string; future: number } {
    return {
      past: this.state.past.length,
      present: this.state.present.action,
      future: this.state.future.length
    };
  }

  // Clear all history
  clearHistory(): void {
    this.state = {
      past: [],
      present: this.state.present,
      future: []
    };
  }

  // Deep equality check for variables
  private deepEqual(a: VariableDefinition[], b: VariableDefinition[]): boolean {
    if (a.length !== b.length) return false;
    
    return a.every((varA, index) => {
      const varB = b[index];
      return varA.name === varB.name &&
             varA.type === varB.type &&
             varA.required === varB.required &&
             varA.description === varB.description &&
             JSON.stringify(varA.defaultValue) === JSON.stringify(varB.defaultValue) &&
             JSON.stringify(varA.options) === JSON.stringify(varB.options);
    });
  }
}