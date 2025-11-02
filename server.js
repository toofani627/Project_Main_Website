import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import dotenv from "dotenv";
import { WebSocketServer } from "ws";
import http from "http";
import fetch from "node-fetch";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

const azureAiEndpoint = process.env.AZURE_PHI4_ENDPOINT || "";
const azureAiKey = process.env.AZURE_PHI4_API_KEY || "";
const azureAiApiVersion = process.env.AZURE_PHI4_API_VERSION || "2024-05-01-preview";

const AGRI_SYSTEM_PROMPT = "You are an agritech AI model that helps farmers by analyzing sensor and weather data. Always respond only in JSON format, never in normal text. Use short and simple words so that a farmer can easily understand the message. Keep the tone helpful and clear. Focus only on irrigation, nutrients, weather impact, and disease risk. Do not include any information about motor or pH.";

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const buildAgritechMessages = ({ telemetry, weather, cropType, language, additionalQuery }) => {
  const safeTelemetry = {
    device: telemetry?.device || telemetry?.deviceId || telemetry?.deviceID || null,
    temperature: toNumberOrNull(telemetry?.temperature),
    humidity: toNumberOrNull(telemetry?.humidity),
    soilMoisture: toNumberOrNull(telemetry?.soilMoisture),
    soilMoistureRaw: toNumberOrNull(telemetry?.soilMoistureRaw),
    lightLevel: toNumberOrNull(telemetry?.lightLevel),
    lightStatus: telemetry?.lightStatus || null,
    latitude: toNumberOrNull(telemetry?.latitude),
    longitude: toNumberOrNull(telemetry?.longitude),
    timestamp: telemetry?.timestamp || null
  };

  const safeWeather = {
    avg_temp_7d: toNumberOrNull(weather?.avg_temp_7d),
    avg_humidity_7d: toNumberOrNull(weather?.avg_humidity_7d),
    rainfall_30d: toNumberOrNull(weather?.rainfall_30d),
    forecast_next_7d: weather?.forecast_next_7d || "unknown",
    sunlight_hours_7d: toNumberOrNull(weather?.sunlight_hours_7d),
    soil_moisture_trend: weather?.soil_moisture_trend || "stable",
    rain_thresh: toNumberOrNull(weather?.rain_thresh)
  };

  const telemetryBlock = JSON.stringify(safeTelemetry, null, 2);
  const weatherBlock = JSON.stringify(safeWeather, null, 2);

  const userPrompt = `Analyze the following data and reply only in JSON format.\n\nTelemetry Data:\n${telemetryBlock}\n\nCrop Type: ${cropType || "unknown"}\nRegional Weather Data:\n${weatherBlock}\n\nLanguage: ${language || "en"}\nAdditional Question: ${additionalQuery || "None"}\n\nRules:\n1. Give output only in JSON format exactly as shown below.\n2. Do not add any text before or after the JSON.\n3. Use simple, farmer-friendly language in ${language || "en"}.\n4. Apply these logic rules:\n   - temperature > 35 C -> hot or heat stress.\n   - humidity > 90% -> high disease chance.\n   - soilMoistureRaw >= 1000 -> very dry -> water needed.\n   - rainfall_30d < rain_thresh and avg_temp_7d rising -> drought risk.\n   - Use forecast and soil moisture trend to adjust irrigation and disease prediction.\n\nReturn your answer strictly in this JSON format only:\n\n{\n  "summary": "<short one-line summary in ${language || "en"}>",\n  "alerts": ["<alert1>", "<alert2>", ...],\n  "predictions": {\n    "irrigation_need": "<low|medium|high>",\n    "disease_risk": "<low|medium|high>",\n    "nutrient_adjustment": "<short tip>",\n    "expected_crop_impact_next_7d": "<short>"\n  },\n  "recommended_actions": ["<simple step 1>", "<simple step 2>", ...],\n  "weather_analysis": {"recent": "<short>", "forecast": "<short>"},\n  "confidence": <0-1>,\n  "explanation": ["<short reason 1>", "<short reason 2>"],\n  "additional_query": "<one follow-up question based on ${additionalQuery || "the farmer's question"}>"\n}\n\nIf the data seems incomplete or unclear, still give your best guess in the same JSON structure. Never break format.`;

  return [
    {
      role: "system",
      content: AGRI_SYSTEM_PROMPT
    },
    {
      role: "user",
      content: userPrompt
    }
  ];
};

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

const callAgritechModel = async (messages) => {
  if (!azureAiEndpoint || !azureAiKey) {
    throw new Error("Azure AI service is not configured. Set AZURE_PHI4_ENDPOINT and AZURE_PHI4_API_KEY in .env");
  }

  const url = `${azureAiEndpoint.replace(/\/$/, "")}/chat/completions?api-version=${azureAiApiVersion}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${azureAiKey}`
    },
    body: JSON.stringify({
      messages,
      temperature: 0.4,
      max_output_tokens: 600,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure AI request failed (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const directContent = result?.output?.[0]?.content?.[0]?.text || result?.choices?.[0]?.message?.content;

  if (!directContent) {
    throw new Error("Azure AI returned an unexpected response format");
  }

  return {
    raw: directContent,
    parsed: JSON.parse(directContent)
  };
};

app.post("/api/ai/analyze", async (req, res) => {
  try {
    const {
      deviceId,
      telemetry: telemetryOverride,
      weather,
      cropType,
      language: lang,
      additionalQuery
    } = req.body || {};

    let telemetry = telemetryOverride;
    const resolvedDeviceId = deviceId || telemetry?.device || telemetry?.deviceId || telemetry?.deviceID || "";

    if (!telemetry && resolvedDeviceId) {
      const device = connectedDevices.get(resolvedDeviceId);
      if (device?.data) {
        telemetry = device.data;
      }
    }

    if (!telemetry) {
      return res.status(400).json({
        error: "Telemetry data is required. Provide telemetry in the request body or specify a deviceId with cached data."
      });
    }

    const messages = buildAgritechMessages({
      telemetry,
      weather,
      cropType,
      language: lang,
      additionalQuery
    });

    const aiResult = await callAgritechModel(messages);

    res.json({
      success: true,
      deviceId: resolvedDeviceId || telemetry.device || null,
      analysis: aiResult.parsed,
      raw: aiResult.raw
    });
  } catch (error) {
    console.error("AI analysis error:", error);
    if (error instanceof SyntaxError) {
      return res.status(502).json({
        error: "Failed to parse AI response as JSON",
        details: error.message
      });
    }
    res.status(500).json({
      error: "Failed to generate AI analysis",
      details: error.message
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
