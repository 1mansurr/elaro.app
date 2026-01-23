/**
 * Type declarations for Detox API extensions
 * These extend the Detox types to include methods that exist at runtime
 * but may not be in the type definitions
 */

declare module 'detox' {
  interface IndexableNativeElement {
    /**
     * Chain multiple element matchers with OR logic
     * @param otherElement Another element matcher
     */
    or(otherElement: IndexableNativeElement): IndexableNativeElement;
    
    /**
     * Check if element is visible
     */
    isVisible(): Promise<boolean>;
  }

  interface Device {
    /**
     * Set network condition for testing offline scenarios
     * @param condition Network condition: 'none' | 'slow2g' | '2g' | '3g' | '4g' | 'wifi'
     */
    setNetworkCondition(condition: 'none' | 'slow2g' | '2g' | '3g' | '4g' | 'wifi'): Promise<void>;
  }
}

declare global {
  namespace jest {
    interface Describe {
      /**
       * Run tests in parallel
       * @param name Test suite name
       * @param fn Test suite function
       */
      parallel(name: string, fn: () => void): void;
    }
  }
}

export {};
