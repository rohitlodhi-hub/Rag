"use client";

import React from "react";
import { jurisdictions, Country } from "@/lib/jurisdictions";

interface JurisdictionSelectorProps {
  country: string;
  state: string;
  onCountryChange: (country: string) => void;
  onStateChange: (state: string) => void;
  disabled?: boolean;
}

export function JurisdictionSelector({
  country,
  state,
  onCountryChange,
  onStateChange,
  disabled
}: JurisdictionSelectorProps) {
  const states = jurisdictions[country as Country] || [];

  return (
    <div className="flex flex-col sm:flex-row gap-4 w-full">
      <div className="flex-1">
        <label className="block text-sm text-muted mb-1">Country</label>
        <select
          value={country}
          onChange={(e) => {
            const newCountry = e.target.value;
            onCountryChange(newCountry);
            // reset state when country changes
            onStateChange(jurisdictions[newCountry as Country]?.[0] || "");
          }}
          disabled={disabled}
          className="w-full bg-cream border border-border-subtle rounded-standard px-3 py-2 text-charcoal focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
        >
          {Object.keys(jurisdictions).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="flex-1">
        <label className="block text-sm text-muted mb-1">State / Province</label>
        <select
          value={state}
          onChange={(e) => onStateChange(e.target.value)}
          disabled={disabled || states.length === 0}
          className="w-full bg-cream border border-border-subtle rounded-standard px-3 py-2 text-charcoal focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
        >
          {states.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
