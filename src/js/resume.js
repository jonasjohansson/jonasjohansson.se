// Google Sheets Resume Integration
// Fetches resume data from Google Sheets and displays it grouped by category

import { RESUME_CONFIG, getApiKey, validateConfig } from "./config/resume.js";

class ResumeManager {
  constructor() {
    this.sheetId = RESUME_CONFIG.SHEET_ID;
    this.apiKey = getApiKey();
    this.resumeData = null;
    this.container = null;
    this.config = RESUME_CONFIG;
  }

  // Initialize the resume manager
  async init(containerId = "resume-container") {
    console.log("Initializing resume manager...");
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.warn("Resume container not found with ID:", containerId);
      console.log("Available elements:", document.querySelectorAll('[id*="resume"]'));
      return;
    }

    console.log("Resume container found:", this.container);

    // Test: Add some basic text first
    this.container.innerHTML = "<p>Loading resume data...</p>";
    console.log("Added loading text to container");

    // No API key needed for published sheets

    try {
      await this.loadResumeData();
      this.renderResume();
    } catch (error) {
      console.error("Failed to load resume data:", error);
      this.showError("Failed to load resume data");
    }
  }

  // Load data from published Google Sheet CSV
  async loadResumeData() {
    // Use CSV export URL instead of HTML for easier parsing
    const csvUrl = this.config.PUBLISHED_URL.replace("/pubhtml", "/pub?output=csv");
    console.log("Fetching CSV from:", csvUrl);

    try {
      const response = await fetch(csvUrl);
      console.log("CSV response status:", response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const csvText = await response.text();
      console.log("CSV text received:", csvText.substring(0, 200));
      this.resumeData = this.parseCSVData(csvText);
      console.log("Parsed resume data:", this.resumeData);
    } catch (error) {
      console.error("Failed to load CSV data:", error);
      // Fallback to empty data
      this.resumeData = {};
    }
  }

  // Parse CSV data from Google Sheets
  parseCSVData(csvText) {
    console.log("CSV data:", csvText.substring(0, 500));

    const lines = csvText.split("\n").filter((line) => line.trim());
    if (lines.length < 2) {
      console.log("No data found in CSV");
      return {};
    }

    // Parse CSV (simple approach)
    const rows = lines.map((line) => {
      // Simple CSV parsing - split by comma and handle quoted fields
      const fields = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          fields.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      fields.push(current.trim());
      return fields;
    });

    const headers = rows[0];
    const dataRows = rows.slice(1);

    console.log("Headers:", headers);
    console.log("Data rows:", dataRows.length);

    // Find column indices by header names
    const filterColumn = this.config.COLUMNS.FILTER;
    const columnKIndex = headers.findIndex((header) => header === filterColumn || header.includes(filterColumn));

    const categoryIndex = headers.findIndex((header) => header.toLowerCase().includes(this.config.COLUMNS.CATEGORY.toLowerCase()));
    const titleIndex = headers.findIndex((header) => header.toLowerCase().includes(this.config.COLUMNS.TITLE.toLowerCase()));
    const descriptionIndex = headers.findIndex((header) => header.toLowerCase().includes(this.config.COLUMNS.DESCRIPTION.toLowerCase()));
    const detailedDescriptionIndex = headers.findIndex((header) =>
      header.toLowerCase().includes(this.config.COLUMNS.DETAILED_DESCRIPTION.toLowerCase())
    );
    const dateIndex = headers.findIndex((header) => header.toLowerCase().includes(this.config.COLUMNS.DATE.toLowerCase()));
    const endDateIndex = headers.findIndex((header) => header.toLowerCase().includes(this.config.COLUMNS.END_DATE.toLowerCase()));
    const locationIndex = headers.findIndex((header) => header.toLowerCase().includes(this.config.COLUMNS.LOCATION.toLowerCase()));
    const cityIndex = headers.findIndex((header) => header.toLowerCase().includes(this.config.COLUMNS.CITY.toLowerCase()));

    console.log("Column indices:", {
      columnKIndex,
      categoryIndex,
      titleIndex,
      descriptionIndex,
      detailedDescriptionIndex,
      dateIndex,
      endDateIndex,
      locationIndex,
      cityIndex,
    });

    const entries = dataRows
      .filter((row) => {
        // Filter based on column K (true/false)
        const columnKValue = row[columnKIndex];
        console.log("Checking row:", row[titleIndex], "In CV value:", columnKValue);
        return columnKValue && (columnKValue.toLowerCase() === "true" || columnKValue === "1");
      })
      .map((row) => ({
        category: row[categoryIndex] || "Other",
        title: row[titleIndex] || "",
        description: row[descriptionIndex] || "",
        detailedDescription: row[detailedDescriptionIndex] || "",
        date: row[dateIndex] || "",
        endDate: row[endDateIndex] || "",
        location: row[locationIndex] || "",
        city: row[cityIndex] || "",
        raw: row,
      }));

    console.log("Filtered entries:", entries);

    // Group by category
    const grouped = entries.reduce((acc, entry) => {
      if (!acc[entry.category]) {
        acc[entry.category] = [];
      }
      acc[entry.category].push(entry);
      return acc;
    }, {});

    console.log("Grouped data:", grouped);
    return grouped;
  }

  // Parse Google Sheets data into structured format (legacy method)
  parseSheetData(values) {
    if (!values || values.length < 2) {
      throw new Error("No data found in sheet");
    }

    const headers = values[0];
    const rows = values.slice(1);

    // Find column indices using configuration
    const filterColumn = this.config.COLUMNS.FILTER;
    const columnKIndex = headers.findIndex((header) => header === filterColumn || header.includes(filterColumn));
    const categoryIndex = headers.findIndex((header) => header.toLowerCase().includes(this.config.COLUMNS.CATEGORY.toLowerCase()));
    const titleIndex = headers.findIndex((header) => header.toLowerCase().includes(this.config.COLUMNS.TITLE.toLowerCase()));
    const descriptionIndex = headers.findIndex((header) => header.toLowerCase().includes(this.config.COLUMNS.DESCRIPTION.toLowerCase()));
    const dateIndex = headers.findIndex((header) => header.toLowerCase().includes(this.config.COLUMNS.DATE.toLowerCase()));

    const entries = rows
      .filter((row) => {
        // Filter based on column K (true/false)
        const columnKValue = row[columnKIndex];
        return columnKValue && (columnKValue.toLowerCase() === "true" || columnKValue === "1");
      })
      .map((row) => ({
        category: row[categoryIndex] || "Other",
        title: row[titleIndex] || "",
        description: row[descriptionIndex] || "",
        date: row[dateIndex] || "",
        raw: row,
      }));

    // Group by category
    const grouped = entries.reduce((acc, entry) => {
      if (!acc[entry.category]) {
        acc[entry.category] = [];
      }
      acc[entry.category].push(entry);
      return acc;
    }, {});

    return grouped;
  }

  // Render the resume data
  renderResume() {
    console.log("Rendering resume link");

    // Just show a simple link to the CV
    const resumeLink = `<p><strong>Selected resume</strong> • <a href="${this.config.PUBLISHED_URL}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;">View full resume</a></p>`;

    console.log("Resume link:", resumeLink);

    // Add the resume link
    this.container.innerHTML = resumeLink;
    console.log("Resume HTML set:", resumeLink);
  }

  // Show error message
  showError(message) {
    if (this.container) {
      this.container.innerHTML = `
        <div class="resume-error">
          <p>${message}</p>
        </div>
      `;
    }
  }

  // Set API key
  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  // Filter entries by category
  filterByCategory(category) {
    if (!this.resumeData) return;

    const filtered = {};
    if (category === "all") {
      Object.assign(filtered, this.resumeData);
    } else {
      filtered[category] = this.resumeData[category] || [];
    }

    this.resumeData = filtered;
    this.renderResume();
  }
}

// Export for use in other modules
export { ResumeManager };

// Auto-initialize if container exists
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Content Loaded - checking for resume container");
  const resumeContainer = document.getElementById("resume-container");
  console.log("Resume container found:", resumeContainer);

  if (resumeContainer) {
    console.log("Initializing resume manager...");
    const resumeManager = new ResumeManager();

    // You'll need to set your Google Sheets API key
    // resumeManager.setApiKey('YOUR_API_KEY_HERE');

    // Initialize the resume manager
    resumeManager.init();
  } else {
    console.log("No resume container found on DOM load");
  }
});

// Also try to initialize after a short delay in case DOM isn't ready
setTimeout(() => {
  console.log("Delayed resume initialization check");
  const resumeContainer = document.getElementById("resume-container");
  if (resumeContainer && !resumeContainer.hasChildNodes()) {
    console.log("Resume container found but empty, initializing...");
    const resumeManager = new ResumeManager();
    resumeManager.init();
  }
}, 1000);
