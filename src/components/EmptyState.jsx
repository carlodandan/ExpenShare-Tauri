import React from 'react';

export default function EmptyState({ message, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-md border border-dashed border-line px-4 py-5">
      <p className="text-sm text-ink-muted">{message}</p>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="text-sm font-medium text-moss hover:underline"
        >
          + {actionLabel}
        </button>
      )}
    </div>
  );
}
