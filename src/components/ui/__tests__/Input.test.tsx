import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import { Input } from '../Input';

describe('Input Component', () => {
  // Unit tests for specific examples
  it('renders with label and helper text', () => {
    render(
      <Input
        label="Email"
        helper="Enter your email address"
        placeholder="email@example.com"
      />
    );
    
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByText('Enter your email address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('email@example.com')).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(<Input label="Email" error="Invalid email format" />);
    
    expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    const input = screen.getByLabelText('Email');
    expect(input).toHaveClass('border-red-300');
  });

  // Property-based tests
  describe('Property Tests', () => {
    /**
     * Feature: crm-refactor, Property 7: Loading State Display
     * Validates: Requirements 1.4
     */
    it('should display loading states appropriately for any input configuration', () => {
      fc.assert(
        fc.property(
          fc.record({
            label: fc.option(fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0 && s.trim() === s)),
            loading: fc.boolean(),
            disabled: fc.boolean(),
            error: fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0 && s.trim() === s && !s.includes('  '))),
            helper: fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0 && s.trim() === s && !s.includes('  '))),
            required: fc.boolean(),
            placeholder: fc.option(fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0 && s.trim() === s))
          }),
          (props) => {
            const { unmount } = render(<Input {...props} />);
            
            try {
              const input = screen.getByRole('textbox');
              
              // When loading is true, input should be disabled
              if (props.loading) {
                expect(input).toBeDisabled();
                // Should show loading spinner
                expect(input.parentElement?.querySelector('.animate-spin')).toBeInTheDocument();
              }
              
              // When disabled is true, input should be disabled
              if (props.disabled) {
                expect(input).toBeDisabled();
              }
              
              // Label should be displayed if provided
              if (props.label) {
                expect(screen.getByText(props.label)).toBeInTheDocument();
                if (props.required) {
                  expect(screen.getByText('*')).toBeInTheDocument();
                }
              }
              
              // Error should be displayed if provided (and helper should not)
              if (props.error) {
                expect(screen.getByText(props.error)).toBeInTheDocument();
                expect(input).toHaveClass('border-red-300');
                if (props.helper) {
                  expect(screen.queryByText(props.helper)).not.toBeInTheDocument();
                }
              } else if (props.helper) {
                expect(screen.getByText(props.helper)).toBeInTheDocument();
              }
              
              // Placeholder should be set if provided
              if (props.placeholder) {
                expect(input).toHaveAttribute('placeholder', props.placeholder);
              }
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    /**
     * Feature: crm-refactor, Property 6: Responsive Layout Adaptation
     * Validates: Requirements 1.2
     */
    it('should maintain usability and accessibility across different configurations', () => {
      fc.assert(
        fc.property(
          fc.record({
            label: fc.option(fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0 && s.trim() === s)),
            type: fc.constantFrom('text', 'email', 'password', 'number', 'tel'),
            required: fc.boolean()
          }),
          (props) => {
            const { unmount } = render(<Input {...props} />);
            
            try {
              // Find input element regardless of type
              const input = document.querySelector('input') as HTMLInputElement;
              
              // Input should always be accessible
              expect(input).toBeInTheDocument();
              expect(input).toHaveClass('w-full', 'px-3', 'py-2', 'border', 'rounded-lg');
              
              // Should have proper focus styles
              expect(input).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500');
              
              // If label is provided, input should be properly associated
              if (props.label) {
                const expectedName = props.required ? `${props.label}*` : props.label;
                expect(input).toHaveAccessibleName(expectedName);
              }
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});