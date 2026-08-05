import { HTMLAttributes, createContext, useContext, ReactNode } from 'react';

/**
 * Minimal accessible tabs primitives (structure matches the rest of the UI kit).
 * Usage:
 *   <Tabs value={active} onValueChange={setActive} className="w-full">
 *     <TabsList className="grid w-full grid-cols-2">
 *       <TabsTrigger value="a">A</TabsTrigger>
 *       <TabsTrigger value="b">B</TabsTrigger>
 *     </TabsList>
 *     <TabsContent value="a">...</TabsContent>
 *     <TabsContent value="b">...</TabsContent>
 *   </Tabs>
 */

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs components must be used within a <Tabs>.');
  return ctx;
}

interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value: string;
  onValueChange: (value: string) => void;
}

export const Tabs = ({ value, onValueChange, children, ...props }: TabsProps) => {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div {...props}>{children}</div>
    </TabsContext.Provider>
  );
};

export const TabsList = ({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      role="tablist"
      className={`inline-flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

interface TabsTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const TabsTrigger = ({ value, className = '', children, onClick, ...props }: TabsTriggerProps) => {
  const { value: activeValue, onValueChange } = useTabsContext();
  const active = activeValue === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={(e) => {
        onValueChange(value);
        onClick?.(e);
      }}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${
        active
          ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  children: ReactNode;
}

export const TabsContent = ({ value, children, className = '', ...props }: TabsContentProps) => {
  const { value: activeValue } = useTabsContext();
  if (activeValue !== value) return null;
  return (
    <div
      role="tabpanel"
      className={`mt-6 focus-visible:outline-none ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Tabs;