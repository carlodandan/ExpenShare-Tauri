import React, { useEffect, useRef, useState } from 'react';

export default function AddTransactionButton({ onAddIncome, onAddExpense }) {
  const [open, setOpen] = useState(false);
  const [menuAbove, setMenuAbove] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const menuHeight = 80; // approximate height of the menu (2 items)

  // Compute if the menu should appear above
  const computeMenuPosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setMenuAbove(spaceBelow < menuHeight);
  };

  // Recompute on open and on resize
  useEffect(() => {
    if (open) {
      computeMenuPosition();
      window.addEventListener('resize', computeMenuPosition);
      return () => window.removeEventListener('resize', computeMenuPosition);
    }
  }, [open]);

  // Click outside to close
  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-md bg-moss text-lg leading-none text-white hover:opacity-90"
        title="Add transaction"
      >
        +
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute right-0 z-20 w-40 overflow-hidden rounded-md border border-line bg-surface shadow-md ${
            menuAbove ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onAddIncome();
            }}
            className="block w-full px-3 py-2 text-left text-sm hover:bg-paper"
          >
            + Income
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onAddExpense();
            }}
            className="block w-full px-3 py-2 text-left text-sm hover:bg-paper"
          >
            + Expense
          </button>
        </div>
      )}
    </div>
  );
}