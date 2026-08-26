import React from 'react';

export default function Toast({ toast }) {
  const tone =
    toast.tone === 'error'
      ? 'border-rust bg-rust-soft text-rust'
      : 'border-moss bg-moss-soft text-moss';

  return (
    <div
      role="status"
      className={`pointer-events-none fixed bottom-20 md:bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-md border px-4 py-2 text-sm shadow-md ${tone}`}
    >
      {toast.message}
    </div>
  );
}
