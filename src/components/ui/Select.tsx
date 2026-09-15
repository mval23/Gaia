import type { SelectHTMLAttributes } from 'react';
import { Icon } from './Icon';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  wrapClassName?: string;
}

export function Select({ wrapClassName, className, children, ...rest }: SelectProps) {
  return (
    <span className={`select-wrap ${wrapClassName ?? ''}`}>
      <select className={`field ${className ?? ''}`} {...rest}>
        {children}
      </select>
      <Icon name="chevronDown" size={14} />
    </span>
  );
}
