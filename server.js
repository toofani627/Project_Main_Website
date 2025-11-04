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

const AGRI_SYSTEM_PROMPT = `You are an Agricultural Intelligence Assistant providing crisp, actionable farming advice.

Analyze the farm data and weather conditions to give a flowing paragraph recommendation in under 100 words.

RESPONSE REQUIREMENTS:
- Write as a single flowing paragraph (NO bullet points, NO asterisks, NO special formatting)
- Maximum 100 words
- Use simple, conversational farmer-friendly language
- Include specific actionable advice with quantities (e.g., "apply 40 kg urea per hectare")
- Maintain natural flow: start with current status → explain key issue/opportunity → give 2-3 specific actions → mention timing
- Be crisp and focused - don't overload with data
- If everything is good, keep it positive and brief
- If there's a problem, prioritize the most critical action first

LANGUAGE RULE:
- If language parameter is "hi": Respond ENTIRELY in Hindi (Hindi script)
- If language parameter is "en": Respond ENTIRELY in English
- Match the language consistently throughout the entire response

Example flow (English): "Your wheat crop at vegetative stage looks healthy with good soil moisture at 65%. The upcoming rain forecast suggests applying nitrogen fertilizer now before the showers. Use 40 kg urea per hectare in the next 2 days. Monitor for fungal growth after rainfall and ensure proper drainage in low-lying areas."

Example flow (Hindi): "आपकी गेहूं की फसल वानस्पतिक अवस्था में स्वस्थ दिख रही है और मिट्टी में 65% नमी अच्छी है। आने वाली बारिश को देखते हुए अभी नाइट्रोजन खाद डालें। 40 किलो यूरिया प्रति हेक्टेयर अगले 2 दिन में डालें। बारिश के बाद फफूंद की निगरानी करें और निचले क्षेत्रों में जल निकासी सुनिश्चित करें।"`;

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const buildAgritechMessages = ({ telemetry, weather, cropType, cropStage, fieldArea, language, additionalQuery }) => {
  // Extract weather arrays (token-efficient format)
  const past5Days = weather?.past5Days || [];
  const next5Days = weather?.next5Days || [];

  // Weather as compact arrays: [temp_min, temp_max, rain_mm, wind_speed]
  const past5Array = past5Days.map(d => `[${d.temp_min}, ${d.temp_max}, ${d.rain_mm}, ${d.wind_speed}]`).join(', ');
  const next5Array = next5Days.map(d => `[${d.temp_min}, ${d.temp_max}, ${d.rain_mm}, ${d.wind_speed}]`).join(', ');

  // Sensor data as arrays
  const sensorData = `pH=${telemetry?.pH || 'N/A'}, Moisture=${telemetry?.soilMoisture || 'N/A'}%, Temp=${telemetry?.temperature || 'N/A'}°C, Humidity=${telemetry?.humidity || 'N/A'}%, Light=${telemetry?.lightLevel || 'N/A'}lux`;

  const userPrompt = `Location: ${telemetry?.latitude || 0}, ${telemetry?.longitude || 0}
Crop: ${cropType || 'unknown'} | Stage: ${cropStage || 'unknown'} | Area: ${fieldArea || 'N/A'} hectares
Sensors: ${sensorData}
Weather Past 5 Days (min,max,rain,wind): ${past5Array || 'No data'}
Weather Next 5 Days (min,max,rain,wind): ${next5Array || 'No data'}
Language: ${language || 'en'}
${additionalQuery ? `Farmer Question: ${additionalQuery}` : ''}

Provide a flowing paragraph recommendation (under 100 words) in ${language === 'hi' ? 'Hindi' : 'English'}.`;

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

  // If endpoint already contains /chat/completions, use it as-is; otherwise append it
  let url = azureAiEndpoint.replace(/\/$/, "");
  if (!url.includes('/chat/completions')) {
    url += '/chat/completions';
  }
  url += `?api-version=${azureAiApiVersion}`;

  // Add 30-second timeout to prevent hanging requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${azureAiKey}`
      },
      body: JSON.stringify({
        messages,
        temperature: 0.4,
        max_output_tokens: 200
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure AI request failed (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    const directContent = result?.output?.[0]?.content?.[0]?.text || result?.choices?.[0]?.message?.content;

    if (!directContent) {
      throw new Error("Azure AI returned an unexpected response format");
    }

    // Return text response directly (no JSON parsing)
    return {
      raw: directContent,
      text: directContent
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Azure AI request timed out after 30 seconds');
    }
    throw error;
  }
};

/**
 * Fetch weather data from Open-Meteo API
 * Past 5 days + Next 5 days forecast
 */
const fetchWeatherData = async (latitude, longitude) => {
  if (!latitude || !longitude || latitude === 0 || longitude === 0) {
    console.warn('⚠️ Invalid coordinates, using default (Central India)');
    latitude = 23.5;
    longitude = 77.0;
  }

  const today = new Date();
  const past5 = new Date(today);
  past5.setDate(past5.getDate() - 5);
  const future5 = new Date(today);
  future5.setDate(future5.getDate() + 5);

  const startDate = past5.toISOString().split('T')[0];
  const endDate = future5.toISOString().split('T')[0];

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&start_date=${startDate}&end_date=${endDate}&timezone=auto`;

  console.log(`🌦️  Fetching weather for (${latitude}, ${longitude})`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Weather API returned ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.daily || !data.daily.time) {
      throw new Error('Weather API returned invalid format');
    }

    const daily = data.daily;
    const allDays = daily.time.map((date, idx) => ({
      date,
      temp_max: daily.temperature_2m_max[idx] || 0,
      temp_min: daily.temperature_2m_min[idx] || 0,
      rain_mm: daily.precipitation_sum[idx] || 0,
      wind_speed: daily.windspeed_10m_max[idx] || 0
    }));

    const todayStr = today.toISOString().split('T')[0];
    const past5Days = allDays.filter(d => d.date < todayStr).slice(-5);
    const next5Days = allDays.filter(d => d.date >= todayStr).slice(0, 5);

    console.log(`✅ Weather: ${past5Days.length} past days, ${next5Days.length} forecast days`);
    return { past5Days, next5Days };

  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Weather API timed out');
    }
    throw error;
  }
};

app.post("/api/ai/analyze", async (req, res) => {
  console.log('\n🌾 === AI Analysis Started ===');
  
  try {
    const {
      deviceId,
      telemetry: telemetryOverride,
      weather,
      cropType,
      cropStage,
      fieldArea,
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

    // Fetch real-time weather data from Open-Meteo
    let weatherData = { past5Days: [], next5Days: [] };
    let weatherFetched = false;
    
    const lat = toNumberOrNull(telemetry?.latitude);
    const lon = toNumberOrNull(telemetry?.longitude);
    
    console.log(`📍 Coordinates: lat=${lat}, lon=${lon}`);

    try {
      weatherData = await fetchWeatherData(lat, lon);
      weatherFetched = true;
      console.log('✅ Weather data fetched successfully');
    } catch (error) {
      console.warn('⚠️ Weather fetch failed, proceeding without weather:', error.message);
    }

    const messages = buildAgritechMessages({
      telemetry,
      weather: weatherData,
      cropType,
      cropStage,
      fieldArea,
      language: lang,
      additionalQuery
    });

    const aiResult = await callAgritechModel(messages);

    res.json({
      success: true,
      deviceId: resolvedDeviceId || telemetry.device || null,
      recommendation: aiResult.text,
      raw: aiResult.raw,
      weather_fetched: weatherFetched,
      weather_days: {
        past: weatherData.past5Days.length,
        forecast: weatherData.next5Days.length
      }
    });
    
    console.log('✅ === AI Analysis Completed ===\n');
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
