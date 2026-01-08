import React from 'react';

export interface CardProps {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  className?: string;
  children: React.ReactNode;
}

const cardVariants = {
  default: 'bg-white shadow-sm',
  elevated: 'bg-white shadow-lg',
  outlined: 'bg-white border border-slate-200'
};

const cardPadding = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6'
};

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  hover = false,
  className = '',
  children
}) => {
  const baseClasses = 'rounded-lg transition-shadow duration-200';
  const variantClasses = cardVariants[variant];
  const paddingClasses = cardPadding[padding];
  const hoverClasses = hover ? 'hover:shadow-md cursor-pointer' : '';
  
  const finalClasses = `${baseClasses} ${variantClasses} ${paddingClasses} ${hoverClasses} ${className}`.trim();

  return (
    <div className={finalClasses}>
      {children}
    </div>
  );
};