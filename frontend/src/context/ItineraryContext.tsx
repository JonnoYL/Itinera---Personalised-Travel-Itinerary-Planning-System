import React, { createContext, useContext, useMemo, useState } from "react";

export type CreatedItinerary = {
  id: string;
  name: string;
  description: string;
  startLocation: string;
  dateISO: string;
  startTimeISO: string;
  endTimeISO: string;
  budget: number;
  categories: string[];
  images?: string[];
};

type ItineraryContextValue = {
  itineraries: CreatedItinerary[];
  addItinerary: (data: Omit<CreatedItinerary, "id">) => string;
  deleteItinerary: (id: string) => void;
};

const ItineraryContext = createContext<ItineraryContextValue | undefined>(
  undefined,
);

export function ItineraryProvider({ children }: { children: React.ReactNode }) {
  const [itineraries, setItineraries] = useState<CreatedItinerary[]>([]);

  const addItinerary = (data: Omit<CreatedItinerary, "id">) => {
    const id = Math.random().toString(36).slice(2, 10);
    const newItem: CreatedItinerary = { id, ...data };
    setItineraries((prev) => [newItem, ...prev]);
    return id;
  };

  const deleteItinerary = (id: string) => {
    setItineraries((prev) => prev.filter((it) => it.id !== id));
  };

  const value = useMemo(
    () => ({ itineraries, addItinerary, deleteItinerary }),
    [itineraries],
  );

  return (
    <ItineraryContext.Provider value={value}>
      {children}
    </ItineraryContext.Provider>
  );
}

export function useItineraries(): ItineraryContextValue {
  const ctx = useContext(ItineraryContext);
  if (!ctx)
    throw new Error("useItineraries must be used within ItineraryProvider");
  return ctx;
}
