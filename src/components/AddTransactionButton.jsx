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
        className="flex h-11 w-11 items-center justify-center rounded-full bg-moss text-2xl leading-none text-white shadow-lg transition-transform active:scale-95 hover:opacity-90 sm:h-9 sm:w-9 sm:rounded-md sm:text-xl"
        title="Add transaction"
      >
        +
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute right-0 z-50 w-44 overflow-hidden rounded-lg border border-line bg-surface shadow-xl ${
            menuAbove ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onAddIncome();
            }}
            className="block w-full px-4 py-3 text-left text-sm font-medium hover:bg-paper active:bg-moss-soft sm:py-2"
          >
            + Add Income
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onAddExpense();
            }}
            className="block w-full border-t border-line px-4 py-3 text-left text-sm font-medium hover:bg-paper active:bg-moss-soft sm:py-2"
          >
            + Add Expense
          </button>
        </div>
      )}
    </div>
  );
}