import React from 'react';
import { GIVING_URL } from '@/lib/giving';

/**
 * A link to Church Center giving. Renders nothing when giving is not
 * configured. Church Center's modal script (loaded in the root layout) catches
 * clicks on this link and opens giving in an overlay; without it, or on a
 * phone, the link opens Church Center in a new tab.
 */
export function GiveLink({
  className,
  children,
  testId,
  onClick,
}: {
  className?: string;
  children: React.ReactNode;
  testId?: string;
  onClick?: () => void;
}) {
  if (!GIVING_URL) return null;
  return (
    <a
      href={GIVING_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      data-testid={testId}
      onClick={onClick}
    >
      {children}
    </a>
  );
}
