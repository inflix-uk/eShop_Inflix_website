"use client";

import { createContext, useContext } from "react";

const BackendAvailabilityContext = createContext<boolean>(false);

export function BackendAvailabilityProvider({
  backendAvailable,
  children,
}: {
  backendAvailable: boolean;
  children: React.ReactNode;
}) {
  return (
    <BackendAvailabilityContext.Provider value={backendAvailable}>
      {children}
    </BackendAvailabilityContext.Provider>
  );
}

export function useBackendAvailability() {
  return useContext(BackendAvailabilityContext);
}
