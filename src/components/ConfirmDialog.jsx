import React from 'react';

export default function ConfirmDialog({ title, description, confirmLabel = 'Delete', onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4">
      <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-5 shadow-lg">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="mt-2 text-sm text-ink-muted">{description}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-paper"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-rust px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
