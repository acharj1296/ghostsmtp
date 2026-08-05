import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  Download,
  Trash2,
  Settings,
} from 'lucide-react';

interface DomainActionMenuProps {
  onVerify: () => void;
  onRefreshDns: () => void;
  onRegenerateDkim: () => void;
  onDownloadDns: () => void;
  onDelete: () => void;
}

const MENU_WIDTH = 208; // w-52 (13rem)
const MENU_ITEM_HEIGHT = 38; // approx height of a single item
const MENU_ITEM_COUNT = 6;
const MENU_HEIGHT = MENU_ITEM_COUNT * MENU_ITEM_HEIGHT + 16; // items + vertical padding
const VIEWPORT_MARGIN = 8;

interface MenuPosition {
  top: number;
  left: number;
}

/**
 * Action dropdown for a domain row.
 *
 * The dropdown renders through a React portal into <body> so it escapes the
 * clipping containers of the domains table (the Table wrapper's overflow-x-auto
 * and the Card's overflow-hidden). It is positioned with `position: fixed`
 * from the trigger button's viewport rect, flips upward near the bottom of the
 * viewport, and closes on outside mousedown, scroll, or resize.
 */
export const DomainActionMenu = ({
  onVerify,
  onRefreshDns,
  onRegenerateDkim,
  onDownloadDns,
  onDelete,
}: DomainActionMenuProps) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    // Right-align the menu to the button's right edge by default.
    let left = rect.right - MENU_WIDTH;
    // Keep the menu inside the left edge of the viewport.
    if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;

    const top = rect.bottom + 4;
    const shouldFlip = top + MENU_HEIGHT > window.innerHeight - VIEWPORT_MARGIN;

    setPosition({
      left,
      // Flip upward when the menu would overflow the bottom of the viewport.
      top: shouldFlip ? rect.top - MENU_HEIGHT - 4 : top,
    });
  }, []);

  const toggle = () => {
    if (!open) updatePosition();
    setOpen((prev) => !prev);
  };

  // Close on outside mousedown, page scroll, or viewport resize.
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      if (triggerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };

    // Capture phase catches scrolls from any ancestor container (including the
    // table's overflow-x-auto wrapper).
    const handleScroll = () => setOpen(false);

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [open]);

  const items = [
    { icon: RefreshCw, label: 'Verify DNS', action: onVerify },
    { icon: Settings, label: 'Refresh DNS', action: onRefreshDns },
    { icon: RotateCcw, label: 'Regenerate DKIM', action: onRegenerateDkim },
    { icon: Download, label: 'Download DNS', action: onDownloadDns },
    { icon: Trash2, label: 'Delete', action: onDelete, danger: true },
  ];

  const runAction = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <>
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Domain actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[1000] w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-100"
            style={{ top: position.top, left: position.left }}
          >
            {items.map((item) => (
              <button
                key={item.label}
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  runAction(item.action);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  item.danger
                    ? 'text-rose-500 hover:bg-rose-500/10'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
};

export default DomainActionMenu;
