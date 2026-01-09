import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import { Card } from '../Card';

describe('Card Component', () => {
  // Unit tests for specific examples
  it('renders with default props', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies hover effect when enabled', () => {
    render(<Card hover>Hoverable card</Card>);
    const cardElement = screen.getByText('Hoverable card').closest('div');
    expect(cardElement).toHaveClass('hover:shadow-md', 'cursor-pointer');
  });

  // Property-based tests
  describe('Property Tests', () => {
    /**
     * Feature: crm-refactor, Property 6: Responsive Layout Adaptation
     * Validates: Requirements 1.2
     */
    it('should maintain proper layout and styling across all variant combinations', () => {
      fc.assert(
        fc.property(
          fc.record({
            variant: fc.constantFrom('default', 'elevated', 'outlined'),
            padding: fc.constantFrom('none', 'sm', 'md', 'lg'),
            hover: fc.boolean(),
            children: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0 && s.trim() === s && !s.includes('  '))
          }),
          (props) => {
            const { unmount } = render(<Card {...props}>{props.children}</Card>);
            
            try {
              const cardElement = screen.getByText(props.children).closest('div');
              
              // Should always have base classes
              expect(cardElement).toHaveClass('rounded-lg', 'transition-shadow');
              
              // Should have variant-specific classes
              if (props.variant === 'default') {
                expect(cardElement).toHaveClass('bg-white', 'shadow-sm');
              } else if (props.variant === 'elevated') {
                expect(cardElement).toHaveClass('bg-white', 'shadow-lg');
              } else if (props.variant === 'outlined') {
                expect(cardElement).toHaveClass('bg-white', 'border', 'border-slate-200');
              }
              
              // Should have hover classes when enabled
              if (props.hover) {
                expect(cardElement).toHaveClass('hover:shadow-md', 'cursor-pointer');
              }
              
              // Content should be visible
              expect(cardElement).toContainElement(screen.getByText(props.children));
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