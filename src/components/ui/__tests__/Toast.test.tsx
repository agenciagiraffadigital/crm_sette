import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import { Toast } from '../Toast';
import { ToastContainer } from '../ToastContainer';
import { useToast } from '../../../hooks/useToast';
import { renderHook, act } from '@testing-library/react';

describe('Toast System', () => {
  // Unit tests for specific examples
  it('renders toast with basic props', () => {
    const mockDismiss = vi.fn();
    render(
      <Toast
        id="test-1"
        type="success"
        title="Success"
        message="Operation completed"
        onDismiss={mockDismiss}
      />
    );
    
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Operation completed')).toBeInTheDocument();
  });

  it('auto-dismisses after duration', async () => {
    const mockDismiss = vi.fn();
    render(
      <Toast
        id="test-1"
        type="info"
        title="Info"
        duration={100}
        onDismiss={mockDismiss}
      />
    );
    
    await waitFor(() => {
      expect(mockDismiss).toHaveBeenCalledWith('test-1');
    }, { timeout: 200 });
  });

  // Property-based tests
  describe('Property Tests', () => {
    /**
     * Feature: crm-refactor, Property 36: Toast Display and Management
     * Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5
     */
    it('should display elegant toast notifications with proper positioning and management', () => {
      fc.assert(
        fc.property(
          fc.record({
            type: fc.constantFrom('success', 'error', 'warning', 'info'),
            title: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0 && s.trim() === s && !s.includes('  ')),
            message: fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0 && s.trim() === s && !s.includes('  '))),
            duration: fc.option(fc.integer({ min: 100, max: 5000 }))
          }),
          (toastProps) => {
            const mockDismiss = vi.fn();
            const { unmount } = render(
              <Toast
                id="test-toast"
                {...toastProps}
                onDismiss={mockDismiss}
              />
            );
            
            try {
              // Toast should always display the title
              expect(screen.getByText(toastProps.title)).toBeInTheDocument();
              
              // If message is provided, it should be displayed
              if (toastProps.message) {
                expect(screen.getByText(toastProps.message)).toBeInTheDocument();
              }
              
              // Should have appropriate styling based on type
              const toastElement = screen.getByText(toastProps.title).closest('[class*="border"]');
              expect(toastElement).toHaveClass('rounded-lg', 'shadow-lg', 'p-4');
              
              // Should have dismiss button
              const dismissButton = screen.getByRole('button');
              expect(dismissButton).toBeInTheDocument();
              
              // Should have appropriate icon for the type
              const iconElement = toastElement?.querySelector('svg');
              expect(iconElement).toBeInTheDocument();
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    /**
     * Feature: crm-refactor, Property 36: Toast Display and Management (Container)
     * Validates: Requirements 12.4, 12.5
     */
    it('should stack multiple notifications elegantly without overlapping', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0 && s.trim() === s),
              type: fc.constantFrom('success', 'error', 'warning', 'info'),
              title: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0 && s.trim() === s),
              onDismiss: fc.constant(vi.fn())
            }),
            { minLength: 1, maxLength: 3 }
          ),
          (toasts) => {
            const mockDismiss = vi.fn();
            const { unmount } = render(
              <ToastContainer toasts={toasts} onDismiss={mockDismiss} />
            );
            
            try {
              // All toasts should be rendered
              toasts.forEach(toast => {
                expect(screen.getByText(toast.title)).toBeInTheDocument();
              });
              
              // Container should have proper positioning classes
              const container = screen.getByText(toasts[0].title).closest('.fixed');
              expect(container).toHaveClass('fixed', 'top-4', 'right-4', 'z-50', 'space-y-2');
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    /**
     * Feature: crm-refactor, Property 36: Toast Display and Management (Hook)
     * Validates: Requirements 12.1, 12.5
     */
    it('should provide proper toast management functionality', () => {
      fc.assert(
        fc.property(
          fc.record({
            type: fc.constantFrom('success', 'error', 'warning', 'info'),
            title: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0 && s.trim() === s),
            message: fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0 && s.trim() === s))
          }),
          (toastData) => {
            const { result } = renderHook(() => useToast());
            
            // Should start with empty toasts
            expect(result.current.toasts).toHaveLength(0);
            
            // Should be able to show a toast
            let toastId: string;
            act(() => {
              toastId = result.current.show(toastData);
            });
            
            // Toast should be added to the list
            expect(result.current.toasts).toHaveLength(1);
            expect(result.current.toasts[0]).toMatchObject(toastData);
            expect(result.current.toasts[0].id).toBe(toastId!);
            
            // Should be able to dismiss the toast
            act(() => {
              result.current.dismiss(toastId!);
            });
            
            // Toast should be removed
            expect(result.current.toasts).toHaveLength(0);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});