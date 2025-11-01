import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import dotenv from "dotenv";
import { WebSocketServer } from "ws";
import http from "http";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Store connected devices: Map<deviceId, {ws, data, lastUpdate}>
const connectedDevices = new Map();

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  console.log('📱 New WebSocket connection established');
  let deviceId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      // Handle device identification
      if (data.type === 'DEVICE_CONNECT') {
        deviceId = data.deviceId || data.device || 'ESP1';
        connectedDevices.set(deviceId, {
          ws: ws,
          data: null,
          lastUpdate: Date.now(),
          connected: true
        });
        console.log(`✅ Device registered: ${deviceId}`);
        ws.send(JSON.stringify({ type: 'CONNECTED', deviceId }));
        return;
      }
      
      // Handle sensor data
      if (data.type === 'SENSOR_DATA' || data.device || data.temperature !== undefined) {
        deviceId = data.deviceId || data.device || deviceId || 'ESP1';
        const deviceInfo = connectedDevices.get(deviceId);
        
        if (deviceInfo) {
          deviceInfo.data = data;
          deviceInfo.lastUpdate = Date.now();
          console.log(`📊 Data received from ${deviceId}:`, {
            temp: data.temperature,
            humidity: data.humidity,
            soil: data.soilMoisture
          });
        } else {
          // Auto-register device
          connectedDevices.set(deviceId, {
            ws: ws,
            data: data,
            lastUpdate: Date.now(),
            connected: true
          });
          console.log(`✅ Device auto-registered: ${deviceId}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    if (deviceId) {
      const device = connectedDevices.get(deviceId);
      if (device) {
        device.connected = false;
      }
      console.log(`📴 Device disconnected: ${deviceId}`);
    }
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// Middleware to parse JSON
app.use(express.json());

// Serve static assets from the dist directory (Vite build output)
app.use(express.static(path.join(__dirname, "dist")));

// API routes can be added here
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from your Azure-backed Node API!" });
});

/**
 * WebSocket-based device data endpoint
 * Get latest data from connected device via WebSocket
 */
app.get("/api/device-data-ws", (req, res) => {
  const deviceId = req.query.device || req.query.id || 'ESP1';
  const device = connectedDevices.get(deviceId);
  
  if (!device) {
    return res.status(404).json({ 
      error: "Device not connected",
      deviceId: deviceId,
      availableDevices: Array.from(connectedDevices.keys())
    });
  }
  
  if (!device.connected) {
    return res.status(503).json({ 
      error: "Device is offline",
      deviceId: deviceId,
      lastSeen: new Date(device.lastUpdate).toISOString()
    });
  }
  
  if (!device.data) {
    return res.status(404).json({ 
      error: "No data available yet. Device connected but hasn't sent data.",
      deviceId: deviceId
    });
  }
  
  res.json(device.data);
});

/**
 * Request sensor data from device
 * Sends command to ESP8266 to read sensors and send back data
 */
app.post("/api/request-data", (req, res) => {
  const deviceId = req.query.device || req.body.device || 'ESP1';
  const device = connectedDevices.get(deviceId);
  
  if (!device) {
    return res.status(404).json({ 
      error: "Device not connected",
      deviceId: deviceId
    });
  }
  
  if (!device.connected || !device.ws) {
    return res.status(503).json({ 
      error: "Device is offline",
      deviceId: deviceId
    });
  }
  
  try {
    // Send command to ESP8266 to read sensors
    device.ws.send(JSON.stringify({
      type: 'READ_SENSORS',
      timestamp: Date.now()
    }));
    
    console.log(`📤 Sent READ_SENSORS command to ${deviceId}`);
    
    res.json({ 
      success: true,
      message: "Data request sent to device",
      deviceId: deviceId
    });
  } catch (error) {
    console.error('Error sending command to device:', error);
    res.status(500).json({ 
      error: "Failed to send command to device",
      details: error.message
    });
  }
});

/**
 * Get list of connected devices
 */
app.get("/api/devices", (req, res) => {
  const devices = [];
  
  connectedDevices.forEach((device, deviceId) => {
    devices.push({
      deviceId: deviceId,
      connected: device.connected,
      lastUpdate: device.lastUpdate,
      hasData: device.data !== null
    });
  });
  
  res.json({ 
    count: devices.length,
    devices: devices
  });
});

/**
 * Proxy endpoint for ESP8266 device data
 * 
 * Solves Mixed Content issue:
 * - Azure website is HTTPS
 * - ESP8266 serves HTTP
 * - Browsers block HTTP requests from HTTPS pages
 * 
 * Solution: Server-side proxy that fetches from HTTP device
 * Frontend calls: https://azure.../api/device-data?ip=192.168.1.100
 * Server fetches: http://192.168.1.100/data
 */
app.get("/api/device-data", async (req, res) => {
  const deviceIP = req.query.ip;
  
  if (!deviceIP) {
    return res.status(400).json({ 
      error: "Missing device IP. Use ?ip=192.168.1.100" 
    });
  }

  // Validate IP format (allow both IPs and domains)
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  const domainPattern = /^[a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+$/;
  
  if (!ipPattern.test(deviceIP) && !domainPattern.test(deviceIP)) {
    return res.status(400).json({ 
      error: "Invalid IP address or domain format" 
    });
  }

  // Check if it's a private/local IP address
  const isLocalIP = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|127\.)/.test(deviceIP);
  if (isLocalIP) {
    return res.status(400).json({ 
      error: "Cannot access local/private IP addresses from Azure server",
      details: `${deviceIP} is on your local network and not accessible from the cloud. Use ngrok (https://ngrok.com) to create a public tunnel, or set up port forwarding on your router.`,
      deviceIP: deviceIP,
      suggestions: [
        "Option 1: Use ngrok - Download from https://ngrok.com, run: ngrok http " + deviceIP.split(':')[0] + ":80",
        "Option 2: Configure port forwarding on your router to make device publicly accessible",
        "Option 3: Test on local network (open website at http://localhost:3000)"
      ]
    });
  }

  try {
    // Import fetch for Node.js
    const fetch = (await import('node-fetch')).default;
    
    // If deviceIP looks like a domain (e.g., ngrok), use https
    const protocol = deviceIP.includes('.') && !ipPattern.test(deviceIP) ? 'https' : 'http';
    const deviceURL = `${protocol}://${deviceIP}/data`;
    console.log(`Proxying request to: ${deviceURL}`);
    
    // Use AbortController for timeout (node-fetch v3)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(deviceURL, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Device returned ${response.status}`);
    }

    const data = await response.json();
    
    // Forward device data to frontend
    res.json(data);
    
  } catch (error) {
    console.error('Device proxy error:', error.message);
    
    res.status(500).json({ 
      error: "Failed to fetch from device",
      details: error.message,
      deviceIP: deviceIP
    });
  }
});

// Support client-side routing by returning index.html for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Start server with WebSocket support
server.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📡 WebSocket server ready for device connections`);
});
