'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';

type TabsContextValue = {
  activeTab: string;
  setActiveTab: (id: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabs() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error('Tabs must be used within TabsProvider');
  return ctx;
}

type TabsProps = {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
};

export function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  className,
  children,
}: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const activeTab = isControlled ? controlledValue : internalValue;

  const setActiveTab = React.useCallback(
    (id: string) => {
      if (!isControlled) setInternalValue(id);
      onValueChange?.(id);
    },
    [isControlled, onValueChange]
  );

  React.useEffect(() => {
    if (isControlled && controlledValue !== undefined) setInternalValue(controlledValue);
  }, [isControlled, controlledValue]);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

type TabsListProps = React.HTMLAttributes<HTMLDivElement>;

export function TabsList({ className, ...props }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-xl bg-slate-100/80 p-1',
        className
      )}
      {...props}
    />
  );
}

type TabsTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
};

export function TabsTrigger({ value, className, ...props }: TabsTriggerProps) {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => setActiveTab(value)}
      className={cn(
        'px-4 py-2 text-sm font-medium rounded-lg transition-all',
        isActive
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-600 hover:text-slate-900',
        className
      )}
      {...props}
    />
  );
}

type TabsContentProps = React.HTMLAttributes<HTMLDivElement> & {
  value: string;
};

export function TabsContent({ value, className, ...props }: TabsContentProps) {
  const { activeTab } = useTabs();
  if (activeTab !== value) return null;
  return (
    <div
      role="tabpanel"
      className={cn('mt-4 outline-none', className)}
      {...props}
    />
  );
}
