"use client";
import * as React from "react";

export function Tabs({ children, ...props }) {
  return (
    <div {...props}>
      {children}
    </div>
  );
}

export function TabsList({ children }) {
  return <div className="flex gap-2">{children}</div>;
}

export function TabsTrigger({ children }) {
  return (
    <button className="px-2 py-1 border rounded">
      {children}
    </button>
  );
}

export function TabsContent({ children }) {
  return <div className="mt-4">{children}</div>;
}
