export const jurisdictions = {
  "United States": [
    "California", "New York", "Texas", "Florida", "Illinois", "Delaware", "Other"
  ],
  "India": [
    "Maharashtra", "Karnataka", "Delhi", "Madhya Pradesh", "Tamil Nadu", "Other"
  ],
  "United Kingdom": [
    "England & Wales", "Scotland", "Northern Ireland"
  ],
  "Canada": [
    "Ontario", "British Columbia", "Quebec", "Alberta", "Other"
  ],
  "Australia": [
    "New South Wales", "Victoria", "Queensland", "Western Australia", "Other"
  ]
};

export type Country = keyof typeof jurisdictions;
