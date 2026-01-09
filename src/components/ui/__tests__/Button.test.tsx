import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import { Button } from '../Button';

describe('Button Component', () => {
  // Unit tests for specific examples
  it('renders with default props', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  // Property-based tests
  describe('Property Tests', () => {
    /**
     * Feature: crm-refactor, Property 7: Loading State Display
     * Validates: Requirements 1.4
     */
    it('should display loading states appropriately for any button configuration', () => {
      fc.assert(
        fc.property(
          fc.record({
            variant: fc.constantFrom('primary', 'secondary', 'outline', 'ghost', 'danger'),
            size: fc.constantFrom('sm', 'md', 'lg'),
            loading: fc.boolean(),
            disabled: fc.boolean(),
            children: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0 && s.trim() === s && !s.includes('  '))
          }),
          (props) => {
            const { unmount } = render(<Button {...props}>{props.children}</Button>);
            
            try {
              const button = screen.getByRole('button');
              
              // When loading is true, button should be disabled
              if (props.loading) {
                expect(button).toBeDisabled();
                // Should show loading spinner (Loader2 component)
                expect(button.querySelector('.animate-spin')).toBeInTheDocument();
              }
              
              // When disabled is true, button should be disabled
              if (props.disabled) {
                expect(button).toBeDisabled();
              }
              
              // Button should always contain the children text
              expect(button).toHaveTextContent(props.children);
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Feature: crm-refactor, Property 6: Responsive Layout Adaptation
     * Validates: Requirements 1.2
     */
    it('should maintain usability across different button sizes and variants', () => {
      fc.assert(
        fc.property(
          fc.record({
            variant: fc.constantFrom('primary', 'secondary', 'outline', 'ghost', 'danger'),
            size: fc.constantFrom('sm', 'md', 'lg'),
            children: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0 && s.trim() === s && !s.includes('  '))
          }),
          (props) => {
            const { unmount } = render(<Button {...props}>{props.children}</Button>);
            
            try {
              const button = screen.getByRole('button');
              
              // Button should always be accessible
              expect(button).toBeInTheDocument();
              expect(button).toHaveAttribute('type', 'button');
              
              // Should have proper classes for the variant and size
              const classes = button.className;
              expect(classes).toContain('inline-flex');
              expect(classes).toContain('items-center');
              expect(classes).toContain('justify-center');
              
              // Text should be visible
              expect(button).toHaveTextContent(props.children);
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});