// =========================================================================
// 🌍 API CONFIGURATION
// =========================================================================

// 1. Enter your Azure Backend URL here
// const PROD_URL = "printq-api-c6h3bsewd5cxfwgr.centralindia-01.azurewebsites.net";
const PROD_URL = "https://printq-api-c6h3bsewd5cxfwgr.centralindia-01.azurewebsites.net"; // Pointing to local backend for .exe testing

// 2. Local Backend URL
const DEV_URL = "http://localhost:3000";

// 3. Toggle this to TRUE to test the Production Backend on Localhost
const USE_PROD_IN_DEV = true; 

// =========================================================================

export const API_BASE_URL = import.meta.env.PROD || USE_PROD_IN_DEV 
  ? PROD_URL 
  : DEV_URL;