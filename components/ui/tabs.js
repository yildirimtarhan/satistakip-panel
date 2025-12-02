"use client";

import { useState } from "react";
import clsx from "clsx";

// Ana Tabs container
export function Tabs({ defaultValue, children }) {
  const [activeTab, setActiveTab] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div>{children}</div>
    </TabsContext.Provider>
  );
}

import { createContext, useContext } from "react";
const TabsContext = createContext();

// Sekme butonlarının olduğu yer
export function TabsList({ children }) {
  return <div className="flex gap-2 border-b mb-4">{children}</div>;
}

// Her bir sekme butonu
export function TabsTrigger({ value, children }) {
  const { activeTab, setActiveTab } = useContext(TabsContext);

  return (
    <button
      className={clsx(
        "px-3 py-1 rounded-t border-b-2",
        activeTab === value
          ? "border-blue-500 text-blue-600"
          : "border-transparent text-gray-600"
      )}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
}

// Sekme içeriği
export function TabsContent({ value, children }) {
  const { activeTab } = useContext(TabsContext);

  if (activeTab !== value) return null;

  return <div className="mt-4">{children}</div>;
}
