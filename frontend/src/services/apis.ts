import axios from "axios";

export const api = axios.create({
  baseURL: "https://printq-api-c6h3bsewd5cxfwgr.centralindia-01.azurewebsites.net/",
});
