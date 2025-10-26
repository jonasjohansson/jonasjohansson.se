// Resume Configuration
// Configure your Google Sheets API key and resume settings here

export const RESUME_CONFIG = {
  // Published Google Sheet URL (no API key needed!)
  PUBLISHED_URL:
    "https://docs.google.com/spreadsheets/u/1/d/e/2PACX-1vSdECybrvqdFRdXdglDL9pYuygE9NiSIRDz7A-GzvuHMOh0-fRfZWww_Wj4SSNk_vtsreDhrGrstGkM/pubhtml",

  // Your Google Sheet ID (from the URL) - kept for reference
  SHEET_ID: "1X3UD7gXJwPpTk0lhgWt7V2qU2Pgm1l1SXZCo6Oboc2w",

  // Column mapping (adjust based on your sheet structure)
  COLUMNS: {
    // Column for true/false filter - your sheet uses "In CV"
    FILTER: "In CV",

    // Based on your current spreadsheet structure:
    CATEGORY: "Category", // Column E
    TITLE: "Title", // Column D
    DESCRIPTION: "Role", // Column G for role/context
    DETAILED_DESCRIPTION: "Context", // Column F for detailed description (tooltip) - now empty
    DATE: "Start date", // Column B
    END_DATE: "End date", // Column C
    LOCATION: "Location", // Column H
    CITY: "City", // Column I
  },

  // Display settings
  DISPLAY: {
    showFilters: true,
    showDates: true,
    groupByCategory: true,
    sortCategories: true,
  },
};

// Helper function to get API key
export function getApiKey() {
  return RESUME_CONFIG.API_KEY;
}

// Helper function to validate configuration
export function validateConfig() {
  if (!RESUME_CONFIG.PUBLISHED_URL) {
    console.warn("Published Google Sheet URL not configured. Please set RESUME_CONFIG.PUBLISHED_URL in src/js/config/resume.js");
    return false;
  }
  return true;
}
