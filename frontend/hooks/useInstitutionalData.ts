"use client";

import {
  useContext,
} from "react";

import {
  InstitutionalDataContext,
} from "@/context/InstitutionalDataContext";

export function useInstitutionalData() {
  const context =
    useContext(
      InstitutionalDataContext
    );

  if (!context) {
    throw new Error(
      "useInstitutionalData debe utilizarse dentro de AppProviders."
    );
  }

  return context;
}