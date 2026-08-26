import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../contexts/AppContextCore.jsx';

export default function ExportMenu({ month }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { showToast } = useAppContext();

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function handleExport(format) {
    setOpen(false);
    try {
      const result = await window.tauriAPI.reports.export(month, format);
      if (!result.canceled) showToast(`Report saved as ${format.toUpperCase()}.`);
    } catch (err) {
      showToast(err?.message || 'Export failed.', 'error');
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-surface"
      >
        Export Report
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-32 overflow-hidden rounded-md border border-line bg-surface shadow-md">
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            className="block w-full px-3 py-2 text-left text-sm hover:bg-paper"
          >
            PDF
          </button>
          <button
            type="button"
            onClick={() => handleExport('csv')}
            className="block w-full px-3 py-2 text-left text-sm hover:bg-paper"
          >
            CSV
          </button>
        </div>
      )}
    </div>
  );
}
