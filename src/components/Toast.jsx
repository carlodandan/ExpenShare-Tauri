import React from 'react';

export default function Toast({ toast }) {
  const tone =
    toast.tone === 'error'
      ? 'border-rust bg-rust-soft text-rust'
      : 'border-moss bg-moss-soft text-moss';

  return (
    <div
      role="status"
      className={`pointer-events-none fixed bottom-5 left-1/2 -translate-x-1/2 rounded-md border px-4 py-2 text-sm shadow-sm ${tone}`}
    >
      {toast.message}
    </div>
  );
}
