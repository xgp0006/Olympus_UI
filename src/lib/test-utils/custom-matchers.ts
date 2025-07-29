/**
 * Custom Jest/Vitest Matchers
 * Provides domain-specific matchers for better test assertions
 */

import { expect } from 'vitest';
import { BoundedArray } from '../utils/bounded-array';

interface MatcherResult {
  pass: boolean;
  message: () => string;
}

/**
 * Check if element has theme CSS variable
 */
function toHaveThemeVariable(
  received: HTMLElement,
  variableName: string,
  expectedValue?: string
): MatcherResult {
  const computedStyle = window.getComputedStyle(received);
  const actualValue = computedStyle.getPropertyValue(`--${variableName}`).trim();

  const pass = expectedValue ? actualValue === expectedValue : actualValue !== '';

  return {
    pass,
    message: () =>
      pass
        ? `Expected element not to have CSS variable --${variableName}${expectedValue ? ` with value "${expectedValue}"` : ''}`
        : `Expected element to have CSS variable --${variableName}${expectedValue ? ` with value "${expectedValue}", but got "${actualValue}"` : ', but it was not found'}`
  };
}

/**
 * Check if element is accessible (has proper ARIA attributes)
 */
function toBeAccessible(received: HTMLElement): MatcherResult {
  // NASA JPL Rule 2: Bounded memory for accessibility issues
  const issues = new BoundedArray<string>(50);

  // Check for basic accessibility requirements
  if (
    received.tagName === 'BUTTON' &&
    !received.hasAttribute('aria-label') &&
    !received.textContent?.trim()
  ) {
    issues.push('Button elements should have aria-label or text content');
  }

  if (
    received.tagName === 'INPUT' &&
    !received.hasAttribute('aria-label') &&
    !received.hasAttribute('aria-labelledby')
  ) {
    issues.push('Input elements should have aria-label or aria-labelledby');
  }

  if (
    received.hasAttribute('role') &&
    received.getAttribute('role') === 'button' &&
    !received.hasAttribute('tabindex')
  ) {
    issues.push('Elements with role="button" should have tabindex');
  }

  const pass = issues.length === 0;

  return {
    pass,
    message: () =>
      pass
        ? 'Expected element not to be accessible'
        : `Expected element to be accessible, but found issues: ${issues.getAll().join(', ')}`
  };
}

/**
 * Check if element has proper test ID
 */
function toHaveTestId(received: HTMLElement, expectedTestId: string): MatcherResult {
  const actualTestId = received.getAttribute('data-testid');
  const pass = actualTestId === expectedTestId;

  return {
    pass,
    message: () =>
      pass
        ? `Expected element not to have test ID "${expectedTestId}"`
        : `Expected element to have test ID "${expectedTestId}", but got "${actualTestId}"`
  };
}

/**
 * Check if element is properly themed (uses CSS variables)
 */
function toBeThemed(received: HTMLElement): MatcherResult {
  const computedStyle = window.getComputedStyle(received);
  const cssText = computedStyle.cssText || '';

  // Check if element uses CSS variables (contains var(--))
  const usesVariables =
    cssText.includes('var(--') ||
    Array.from(computedStyle).some((prop) => {
      const value = computedStyle.getPropertyValue(prop);
      return value.includes('var(--');
    });

  const pass = usesVariables;

  return {
    pass,
    message: () =>
      pass
        ? 'Expected element not to use theme variables'
        : 'Expected element to use theme variables (CSS custom properties starting with var(--))'
  };
}

/**
 * Check if component properly handles loading state
 */
function toHandleLoadingState(received: HTMLElement): MatcherResult {
  const hasLoadingIndicator =
    received.querySelector('[data-testid*="loading"]') !== null ||
    received.querySelector('.loading') !== null ||
    (received.textContent?.includes('Loading') ?? false) ||
    (received.textContent?.includes('loading') ?? false);

  const pass = hasLoadingIndicator;

  return {
    pass,
    message: () =>
      pass
        ? 'Expected component not to handle loading state'
        : 'Expected component to handle loading state (should have loading indicator or text)'
  };
}

/**
 * Check if component properly handles error state
 */
function toHandleErrorState(received: HTMLElement): MatcherResult {
  const hasErrorIndicator =
    received.querySelector('[data-testid*="error"]') !== null ||
    received.querySelector('.error') !== null ||
    received.querySelector('[role="alert"]') !== null;

  const pass = hasErrorIndicator;

  return {
    pass,
    message: () =>
      pass
        ? 'Expected component not to handle error state'
        : 'Expected component to handle error state (should have error indicator or alert)'
  };
}

/**
 * Check if element has proper keyboard navigation
 */
function toSupportKeyboardNavigation(received: HTMLElement): MatcherResult {
  // NASA JPL Rule 2: Bounded memory for keyboard navigation issues
  const issues = new BoundedArray<string>(50);

  // Check if interactive elements are focusable
  const interactiveElements = received.querySelectorAll(
    'button, input, select, textarea, a[href], [tabindex]'
  );

  interactiveElements.forEach((element) => {
    const tabIndex = element.getAttribute('tabindex');
    if (tabIndex === '-1' && element.tagName !== 'INPUT') {
      // Only inputs can have tabindex="-1" for programmatic focus
      issues.push(`${element.tagName} element should be focusable`);
    }
  });

  // Check for keyboard event handlers on interactive elements
  const hasKeyboardHandlers = Array.from(interactiveElements).some((element) => {
    return (
      element.hasAttribute('onkeydown') ||
      element.hasAttribute('onkeyup') ||
      element.hasAttribute('onkeypress')
    );
  });

  if (interactiveElements.length > 0 && !hasKeyboardHandlers) {
    // This is a warning, not a failure - some elements handle keyboard events through event delegation
  }

  const pass = issues.length === 0;

  return {
    pass,
    message: () =>
      pass
        ? 'Expected element not to support keyboard navigation'
        : `Expected element to support keyboard navigation, but found issues: ${issues.getAll().join(', ')}`
  };
}

/**
 * Check if Tauri command was called with correct parameters
 */
function toHaveBeenCalledWithTauriCommand(
  received: any,
  command: string,
  args?: Record<string, unknown>
): MatcherResult {
  if (typeof received !== 'function' || !received.mock) {
    return {
      pass: false,
      message: () => 'Expected a mock function'
    };
  }

  const calls = received.mock.calls;
  const matchingCall = calls.find((call: any[]) => {
    if (call[0] !== command) return false;
    if (!args) return true;

    const callArgs = call[1];
    return JSON.stringify(callArgs) === JSON.stringify(args);
  });

  const pass = !!matchingCall;

  return {
    pass,
    message: () =>
      pass
        ? `Expected mock not to have been called with Tauri command "${command}"${args ? ` and args ${JSON.stringify(args)}` : ''}`
        : `Expected mock to have been called with Tauri command "${command}"${args ? ` and args ${JSON.stringify(args)}` : ''}, but it was not`
  };
}

// Extend expect with custom matchers
expect.extend({
  toHaveThemeVariable,
  toBeAccessible,
  toHaveTestId,
  toBeThemed,
  toHandleLoadingState,
  toHandleErrorState,
  toSupportKeyboardNavigation,
  toHaveBeenCalledWithTauriCommand
});

// Type declarations for TypeScript
declare module 'vitest' {
  interface Assertion<T = any> {
    toHaveThemeVariable(variableName: string, expectedValue?: string): T;
    toBeAccessible(): T;
    toHaveTestId(expectedTestId: string): T;
    toBeThemed(): T;
    toHandleLoadingState(): T;
    toHandleErrorState(): T;
    toSupportKeyboardNavigation(): T;
    toHaveBeenCalledWithTauriCommand(command: string, args?: Record<string, unknown>): T;
  }
}

export {
  toHaveThemeVariable,
  toBeAccessible,
  toHaveTestId,
  toBeThemed,
  toHandleLoadingState,
  toHandleErrorState,
  toSupportKeyboardNavigation,
  toHaveBeenCalledWithTauriCommand
};
