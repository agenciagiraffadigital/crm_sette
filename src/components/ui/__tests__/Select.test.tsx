import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import { Select } from '../Select';

describe('Select Component', () => {
  const sampleOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' }
  ];

  // Unit tests for specific examples
  it('renders with options', () => {
    render(
      <Select
        label="Choose option"
        options={sampleOptions}
        placeholder="Select an option"
      />
    );
    
    expect(screen.getByLabelText('Choose option')).toBeInTheDocument();
    expect(screen.getByText('Select an option')).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(
      <Select
        label="Choose option"
        options={sampleOptions}
        error="Please select an option"
      />
    );
    
    expect(screen.getByText('Please select an option')).toBeInTheDocument();
    const select = screen.getByLabelText('Choose option');
    expect(select).toHaveClass('border-red-300');
  });

  // Property-based tests
  describe('Property Tests', () => {
    /**
     * Feature: crm-refactor, Property 7: Loading State Display
     * Validates: Requirements 1.4
     */
    it('should display loading states appropriately for any select configuration', () => {
      fc.assert(
        fc.property(
          fc.record({
            label: fc.option(fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0 && s.trim() === s)),
            loading: fc.boolean(),
            disabled: fc.boolean(),
            error: fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0 && s.trim() === s && !s.includes('  '))),
            helper: fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0 && s.trim() === s && !s.includes('  '))),
            required: fc.boolean(),
            placeholder: fc.option(fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0 && s.trim() === s && !s.includes('  '))),
            options: fc.array(
              fc.record({
                value: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0 && s.trim() === s && !s.includes('  ')),
                label: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0 && s.trim() === s && !s.includes('  '))
              }),
              { minLength: 1, maxLength: 3 }
            )
          }),
          (props) => {
            const { unmount } = render(<Select {...props} />);
            
            try {
              const selects = screen.getAllByRole('combobox');
              const select = selects[selects.length - 1]; // Get the last one to avoid conflicts
              
              // When loading is true, select should be disabled
              if (props.loading) {
                expect(select).toBeDisabled();
                // Should show loading spinner instead of chevron
                expect(select.parentElement?.querySelector('.animate-spin')).toBeInTheDocument();
              } else {
                // Should show chevron when not loading
                expect(select.parentElement?.querySelector('svg')).toBeInTheDocument();
              }
              
              // When disabled is true, select should be disabled
              if (props.disabled) {
                expect(select).toBeDisabled();
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
                expect(select).toHaveClass('border-red-300');
                if (props.helper) {
                  expect(screen.queryByText(props.helper)).not.toBeInTheDocument();
                }
              } else if (props.helper) {
                expect(screen.getByText(props.helper)).toBeInTheDocument();
              }
              
              // All options should be present
              props.options.forEach(option => {
                const optionElement = screen.getByRole('option', { name: option.label });
                expect(optionElement).toBeInTheDocument();
              });
              
              // Placeholder should be present if provided
              if (props.placeholder) {
                expect(screen.getByText(props.placeholder)).toBeInTheDocument();
              }
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 20 }
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
            label: fc.option(fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0 && s.trim() === s && !s.includes('  '))),
            required: fc.boolean(),
            options: fc.array(
              fc.record({
                value: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0 && s.trim() === s && !s.includes('  ')),
                label: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0 && s.trim() === s && !s.includes('  '))
              }),
              { minLength: 1, maxLength: 3 }
            )
          }),
          (props) => {
            const { unmount } = render(<Select {...props} />);
            
            try {
              const selects = screen.getAllByRole('combobox');
              const select = selects[selects.length - 1]; // Get the last one to avoid conflicts
              
              // Select should always be accessible
              expect(select).toBeInTheDocument();
              expect(select).toHaveClass('w-full', 'px-3', 'py-2', 'border', 'rounded-lg');
              
              // Should have proper focus styles
              expect(select).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500');
              
              // If label is provided, select should be properly associated
              if (props.label) {
                const expectedName = props.required ? `${props.label}*` : props.label;
                expect(select).toHaveAccessibleName(expectedName);
              }
              
              // All options should be selectable
              props.options.forEach(option => {
                const optionElement = screen.getByRole('option', { name: option.label });
                expect(optionElement).toHaveAttribute('value', option.value);
              });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});