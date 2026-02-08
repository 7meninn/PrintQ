import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "../config";

const StationContext = createContext();

export const useStation = () => useContext(StationContext);

export function StationProvider({ children }) {
  const [station, setStation] = useState(null); 
  const [printers, setPrinters] = useState([]);
  const [config, setConfig] = useState({ 
    bw: "Not Available", 
    color: "Not Available",
    bwA3: "Not Available",
    colorA3: "Not Available"
  });
  
  // 'idle' | 'active' | 'paused'
  const [serviceStatus, setServiceStatus] = useState("idle");

  // Refs to hold latest state for the interval (prevents closure staleness)
  const stateRef = useRef({ 
    station: null, 
    config: { 
      bw: "Not Available", 
      color: "Not Available",
      bwA3: "Not Available",
      colorA3: "Not Available"
    }, 
    status: "idle" 
  });

  // Sync Refs whenever state changes
  useEffect(() => {
    stateRef.current = { station, config, status: serviceStatus };
  }, [station, config, serviceStatus]);

  // --- 1. Load Hardware ---
  useEffect(() => {
    const loadHardware = async () => {
      try {
        if (window.electronAPI) {
          const list = await window.electronAPI.getPrinters();
          setPrinters(list || []);
        }
      } catch (err) {
        console.error("Hardware Scan Failed:", err);
      }
    };
    loadHardware();
  }, []);

  // --- 2. Heartbeat Engine (Always Running if Logged In) ---
  useEffect(() => {
    const sendHeartbeat = async () => {
      const { station, config, status } = stateRef.current;
      
      // Only send if logged in
      if (!station?.id) return;

      const isLive = status === 'active';
      // Calculate capabilities based on ACTIVE status + CONFIG
      const has_bw = isLive && config.bw !== "Not Available";
      const has_color = isLive && config.color !== "Not Available";
      const has_bw_a3 = isLive && config.bwA3 !== "Not Available";
      const has_color_a3 = isLive && config.colorA3 !== "Not Available";

      try {
        // Send heartbeat to server
        await fetch(`${API_BASE_URL}/shop/heartbeat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            id: station.id, 
            has_bw, 
            has_color,
            has_bw_a3,
            has_color_a3
          })
        });
        // Uncomment to debug heartbeat logs in console
        // console.log(`💓 Heartbeat: Status=${status}, BW=${has_bw}, Color=${has_color}`);
      } catch (e) {
        console.error("Heartbeat Failed (Server Offline?):", e.message);
      }
    };

    // Send immediately on status change
    if (station) sendHeartbeat();

    // Set interval to 4 seconds (safer than 5s for a 15s window)
    const interval = setInterval(sendHeartbeat, 4000);

    return () => clearInterval(interval);
  }, [serviceStatus, station?.id]); // Restart only if status/user changes, NOT config

  // --- Actions ---
  
  const login = (loginData) => {
    const { shop, server_time } = loginData;
    
    // --- Daily Stats Reset Logic ---
    try {
      const lastLoginDate = localStorage.getItem('lastLoginDate');
      const serverDate = new Date(server_time).toISOString().split('T')[0];

      if (lastLoginDate !== serverDate) {
        console.log(`New day detected. Old: ${lastLoginDate}, New: ${serverDate}. Resetting stats.`);
        
        // Clear old stat entries for this shop
        const statsPrefix = `printq_stats_${shop.id}_`;
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(statsPrefix)) {
            localStorage.removeItem(key);
            console.log(`Removed old stats key: ${key}`);
          }
        });
      }
      // Update the last login date
      localStorage.setItem('lastLoginDate', serverDate);
    } catch (e) {
      console.error("Failed to process daily stats reset:", e);
    }
    // --- End of Logic ---

    setStation(shop);
  };

  const logout = () => {
    // Send one final "Offline" signal
    if (station?.id) {
        fetch(`${API_BASE_URL}/shop/heartbeat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              id: station.id, 
              has_bw: false, 
              has_color: false,
              has_bw_a3: false,
              has_color_a3: false
            })
        }).catch(e => console.error(e));
    }
    setStation(null);
    setServiceStatus("idle");
  };

  return (
    <StationContext.Provider value={{ 
      station, 
      printers, 
      config, 
      setConfig, 
      serviceStatus, 
      setServiceStatus,
      login, 
      logout 
    }}>
      {children}
    </StationContext.Provider>
  );
}
