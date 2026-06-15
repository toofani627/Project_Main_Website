import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import dotenv from "dotenv";
import { WebSocketServer } from "ws";
import http from "http";
import fetch from "node-fetch";
import cors from "cors";
import mongoose from "mongoose";

dotenv.config();

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || '';

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch((err) => console.error('❌ MongoDB connection error:', err.message));
} else {
  console.warn('⚠️  MONGODB_URI not set — profile persistence disabled');
}

// UserProfile schema — one document per username (source of truth for auth + farm data)
const userProfileSchema = new mongoose.Schema({
  username:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:    { type: String, required: true },
  lastDevice:  { type: String, default: null },
  crops:       { type: Array,  default: [] },   // [{ id, name, dateGrown }]
  fertilizers: { type: Array,  default: [] },   // [{ id, name, amount, unit }]
  updatedAt:   { type: Date,   default: Date.now }
});

const UserProfile = mongoose.model('UserProfile', userProfileSchema);
// ──────────────────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

const azureAiEndpoint = process.env.AZURE_PHI4_ENDPOINT || "";
const azureAiKey = process.env.AZURE_PHI4_API_KEY || "";
const azureAiApiVersion = process.env.AZURE_PHI4_API_VERSION || "2024-05-01-preview";

const WEATHER_HISTORICAL_DAYS = Math.min(14, Math.max(7, Number(process.env.WEATHER_HISTORICAL_DAYS) || 14));
const WEATHER_FORECAST_DAYS = Math.max(7, Number(process.env.WEATHER_FORECAST_DAYS) || 7);
const VALID_FERTILIZER_UNITS = ["kgs/bigha", "kgs/hectare", "kgs/acre"];

const buildAgriSystemPrompt = (language) => {
  const isHindi = language === "hi";
  const isTamil = language === "ta";

  return `You are an advanced Agricultural Intelligence Assistant for Indian farmers.

Your task is to analyze real soil moisture, synthesized soil chemistry (N/P/K, pH, EC), ${WEATHER_HISTORICAL_DAYS}-day weather history, ${WEATHER_FORECAST_DAYS}-day forecast, farm rotation history, and the farmer's current crop context.

🚨 CRITICAL: YOU MUST RESPOND ONLY WITH A VALID JSON OBJECT. Do not wrap it in markdown codeblocks (like \`\`\`json ... \`\`\`). Only return raw JSON.

JSON Structure:
{
  "soil_score": 85,
  "soil_summary": "Summary of soil health, moisture, and nutrient balance in 2-3 sentences.",
  "top_crops": [
    {
      "name": "Crop Name",
      "match_percentage": 94,
      "reason": "Reason for recommendation tied to soil/weather.",
      "companions": ["Companion 1", "Companion 2"]
    }
  ]
}

### Analysis Logic:
1. Weigh soil moisture + recent rainfall + forecast rain for irrigation and planting windows
2. Weigh N, P, K, pH, EC together for nutrient suitability and salinity stress
3. Cross-check farm history (prior crops, fertilizer) to avoid repetition and nutrient gaps
4. Calculate a realistic "soil_score" (0-100) based on optimal conditions
5. Provide exactly 3-5 optimal crops, ranked by "match_percentage" (highest first)
6. Recommend 1-2 companion plants for each crop

${isHindi ? `
🚨 CRITICAL: RESPOND IN HINDI ONLY 🚨
(हिन्दी में जवाब दें - सभी शब्द हिन्दी में)` : isTamil ? `
🚨 CRITICAL: RESPOND IN TAMIL ONLY 🚨
(தமிழில் பதில் அளிக்கவும் - அனைத்து வார்த்தைகளும் தமிழில்)` : `
🚨 CRITICAL: RESPOND IN ENGLISH ONLY 🚨
(Respond in English - all words in English)`}
`;
};


const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const roundTo = (value, decimals = 1) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

/**
 * ESP32 provides soil_moisture only; synthesize realistic NPK / pH / EC for demo & AI pipeline.
 * Values are moisture-correlated so they feel agronomically plausible.
 */
const enrichTelemetryWithMockSensors = (payload = {}) => {
  const soilMoisture = toNumberOrNull(payload.soil_moisture ?? payload.soilMoisture);
  if (soilMoisture === null) {
    return payload;
  }

  const moistureFactor = Math.min(1, Math.max(0, soilMoisture / 100));
  const nitrogen = roundTo(22 + moistureFactor * 38 + Math.random() * 18, 1);
  const phosphorus = roundTo(10 + moistureFactor * 22 + Math.random() * 10, 1);
  const potassium = roundTo(85 + moistureFactor * 95 + Math.random() * 45, 1);
  const ph_level = roundTo(
    Math.min(8.5, Math.max(5.2, 6.2 + (moistureFactor - 0.5) * 1.4 + (Math.random() - 0.5) * 0.6)),
    1
  );
  const electrical_conductivity = roundTo(0.35 + moistureFactor * 1.4 + Math.random() * 0.55, 2);

  return {
    ...payload,
    soil_moisture: soilMoisture,
    soilMoisture: soilMoisture,
    nitrogen,
    n: nitrogen,
    phosphorus,
    p: phosphorus,
    potassium,
    k: potassium,
    ph_level,
    pH: ph_level,
    ph: ph_level,
    electrical_conductivity,
    ec: electrical_conductivity,
    _mock_sensors_generated: true
  };
};

const normalizeTelemetry = (raw = {}) => {
  const enriched = enrichTelemetryWithMockSensors(raw);
  const soilMoisture = toNumberOrNull(enriched.soil_moisture ?? enriched.soilMoisture);
  const phLevel = toNumberOrNull(enriched.ph_level ?? enriched.pH ?? enriched.ph);

  return {
    device: enriched.device || enriched.deviceId || enriched.deviceID || null,
    temperature: toNumberOrNull(enriched.temperature),
    humidity: toNumberOrNull(enriched.humidity),
    soilMoisture,
    soil_moisture: soilMoisture,
    soilTemperature: toNumberOrNull(enriched.soilTemperature ?? enriched.soil_temperature),
    soilMoistureRaw: toNumberOrNull(enriched.soilMoistureRaw ?? enriched.soil_moisture_raw),
    lightLevel: toNumberOrNull(enriched.lightLevel ?? enriched.light_level),
    lightStatus: enriched.lightStatus || enriched.light_status || null,
    latitude: toNumberOrNull(enriched.latitude),
    longitude: toNumberOrNull(enriched.longitude),
    nitrogen: toNumberOrNull(enriched.nitrogen ?? enriched.n),
    phosphorus: toNumberOrNull(enriched.phosphorus ?? enriched.p),
    potassium: toNumberOrNull(enriched.potassium ?? enriched.k),
    ph_level: phLevel,
    pH: phLevel,
    electrical_conductivity: toNumberOrNull(enriched.electrical_conductivity ?? enriched.ec),
    mock_sensors_generated: Boolean(enriched._mock_sensors_generated),
    timestamp: enriched.timestamp || Date.now()
  };
};

const validateFarmHistory = (farmHistory = {}) => {
  const errors = [];
  const normalized = {
    crop_1_name: farmHistory.crop_1_name?.trim() || null,
    crop_1_date_grown: farmHistory.crop_1_date_grown || null,
    crop_2_name: farmHistory.crop_2_name?.trim() || null,
    crop_2_date_grown: farmHistory.crop_2_date_grown || null,
    fertilizer_used_name: farmHistory.fertilizer_used_name?.trim() || null,
    fertilizer_amount: toNumberOrNull(farmHistory.fertilizer_amount),
    fertilizer_unit: farmHistory.fertilizer_unit || null
  };

  if (normalized.fertilizer_amount !== null && normalized.fertilizer_amount < 0) {
    errors.push("fertilizer_amount must be a non-negative number");
  }

  if (normalized.fertilizer_unit && !VALID_FERTILIZER_UNITS.includes(normalized.fertilizer_unit)) {
    errors.push(`fertilizer_unit must be one of: ${VALID_FERTILIZER_UNITS.join(", ")}`);
  }

  if (normalized.fertilizer_amount !== null && !normalized.fertilizer_unit) {
    errors.push("fertilizer_unit is required when fertilizer_amount is provided");
  }

  return { normalized, errors };
};

const validateAssessmentPayload = ({ telemetry, soilPH, farmHistoryInput }) => {
  const errors = [];
  const { normalized: farmHistory, errors: farmErrors } = validateFarmHistory(farmHistoryInput || {});
  errors.push(...farmErrors);

  const phLevel = toNumberOrNull(soilPH ?? telemetry?.ph_level ?? telemetry?.pH);
  if (phLevel !== null && (phLevel < 0 || phLevel > 14)) {
    errors.push("ph_level must be between 0 and 14");
  }

  for (const key of ["nitrogen", "phosphorus", "potassium", "electrical_conductivity", "soil_moisture", "soilMoisture"]) {
    const value = toNumberOrNull(telemetry?.[key]);
    if (value !== null && value < 0) {
      errors.push(`${key} must be a non-negative number`);
    }
  }

  return { errors, farmHistory };
};

const formatFarmHistory = (farmHistory = {}) => {
  const parts = [];
  if (farmHistory.crop_1_name) {
    parts.push(`Previous crop 1: ${farmHistory.crop_1_name}${farmHistory.crop_1_date_grown ? ` (grown: ${farmHistory.crop_1_date_grown})` : ""}`);
  }
  if (farmHistory.crop_2_name) {
    parts.push(`Previous crop 2: ${farmHistory.crop_2_name}${farmHistory.crop_2_date_grown ? ` (grown: ${farmHistory.crop_2_date_grown})` : ""}`);
  }
  if (farmHistory.fertilizer_used_name) {
    const amount = farmHistory.fertilizer_amount != null ? ` ${farmHistory.fertilizer_amount}` : "";
    const unit = farmHistory.fertilizer_unit ? ` ${farmHistory.fertilizer_unit}` : "";
    parts.push(`Last fertilizer: ${farmHistory.fertilizer_used_name}${amount}${unit}`);
  }
  return parts.length ? parts.join(" | ") : "No historical farm data provided";
};

const buildAgritechMessages = ({ telemetry, weather, cropType, cropStage, fieldArea, soilPH, language, additionalQuery, farmHistory }) => {
  const pastDays = weather?.pastDays || weather?.past5Days || [];
  const nextDays = weather?.nextDays || weather?.next5Days || [];

  const pastArray = pastDays.map(d => `[${d.temp_min}, ${d.temp_max}, ${d.rain_mm}, ${d.wind_speed}]`).join(', ');
  const nextArray = nextDays.map(d => `[${d.temp_min}, ${d.temp_max}, ${d.rain_mm}, ${d.wind_speed}]`).join(', ');
  const totalPastRain = weather?.summary?.totalPastRainfallMm ?? pastDays.reduce((sum, d) => sum + (d.rain_mm || 0), 0);

  const phValue = soilPH || telemetry?.ph_level || telemetry?.pH || 'N/A';
  const moisture = telemetry?.soil_moisture ?? telemetry?.soilMoisture ?? 'N/A';
  const mockNote = telemetry?.mock_sensors_generated ? 'model-estimated from moisture' : 'device-reported';

  const realSensors = [
    `SoilMoisture=${moisture}% (REAL)`,
    `AirTemp=${telemetry?.temperature ?? 'N/A'}°C`,
    `Humidity=${telemetry?.humidity ?? 'N/A'}%`
  ].join(', ');

  const soilChemistry = [
    `N=${telemetry?.nitrogen ?? 'N/A'} mg/kg`,
    `P=${telemetry?.phosphorus ?? 'N/A'} mg/kg`,
    `K=${telemetry?.potassium ?? 'N/A'} mg/kg`,
    `pH=${phValue}`,
    `EC=${telemetry?.electrical_conductivity ?? 'N/A'} dS/m`
  ].join(', ');

  const selectedLanguage = language || 'en';
  const isHindi = selectedLanguage === 'hi';
  const isTamil = selectedLanguage === 'ta';

  const userPrompt = `Location: ${telemetry?.latitude || 0}, ${telemetry?.longitude || 0}
Current Crop: ${cropType || 'unknown'} | Stage: ${cropStage || 'unknown'} | Area: ${fieldArea || 'N/A'} hectares
Real Sensors: ${realSensors}
Soil Chemistry (${mockNote}): ${soilChemistry}${soilPH ? ` | Manual pH override: ${soilPH}` : ''}
Farm History (rotation & fertilizer): ${formatFarmHistory(farmHistory)}
Weather Past ${pastDays.length} Days [min°C,max°C,rain_mm,wind]: ${pastArray || 'No data'}
Cumulative rainfall (past ${pastDays.length} days): ${totalPastRain.toFixed(1)} mm
Weather Next ${nextDays.length} Days [min°C,max°C,rain_mm,wind]: ${nextArray || 'No data'}
Forecast rainfall (next ${nextDays.length} days): ${(weather?.summary?.forecastRainfallMm ?? nextDays.reduce((s, d) => s + (d.rain_mm || 0), 0)).toFixed(1)} mm
${additionalQuery && additionalQuery !== 'None' ? `Farmer Question: ${additionalQuery}` : ''}

TASK: Using soil moisture (real), N/P/K/pH/EC, farm history, and weather — output the TOP 3 optimal crop recommendations as a numbered list.

🚨 RESPOND IN ${isHindi ? 'HINDI (हिन्दी) ONLY' : isTamil ? 'TAMIL (தமிழ்) ONLY' : 'ENGLISH ONLY'} 🚨
${isHindi ? 'हिन्दी में जवाब दें - सभी शब्द हिन्दी में' : isTamil ? 'தமிழில் பதில் அளிக்கவும் - அனைத்து வார்த்தைகளும் தமிழில்' : 'Respond in English - all words in English'}`;

  return [
    {
      role: "system",
      content: buildAgriSystemPrompt(selectedLanguage)
    },
    {
      role: "user",
      content: userPrompt
    }
  ];
};

const buildCompanionSystemPrompt = (language) => {
  const isHindi = language === "hi";
  const isTamil = language === "ta";

  return `You are an advanced Agricultural Companion Planting Assistant.
Your task is to recommend the best companion crop to plant alongside the farmer's current crop during its specific growth stage.
You must analyze the crop and its growth stage to provide a scientifically sound, beneficial companion planting recommendation.

🚨 CRITICAL: YOU MUST RESPOND ONLY WITH A VALID JSON OBJECT containing EXACTLY these four keys. Do not wrap it in markdown codeblocks (like \`\`\`json ... \`\`\`). Only return raw JSON.

JSON Structure:
{
  "recommendation": "Name of the recommended companion crop",
  "reason": "Scientific reason for this companion pairing (e.g. pest repellent, nutrient fixing, shade, microclimate, root space)",
  "benefits": ["Benefit 1", "Benefit 2", "Benefit 3"],
  "warning": "Any warnings, potential issues, or combinations/crops to avoid planting nearby"
}

Ensure the content inside the JSON object is written in the requested language:
${isHindi ? 'Language: Hindi only (हिन्दी script)' : isTamil ? 'Language: Tamil only (தமிழ் script)' : 'Language: English only'}
`;
};

const buildCompanionMessages = ({ crop, stage, language, telemetry, farmHistory }) => {
  const selectedLanguage = language || 'en';
  
  let telemetryContext = '';
  if (telemetry) {
    telemetryContext = `
Field Conditions:
- Soil Moisture: ${telemetry.soil_moisture ?? telemetry.soilMoisture ?? 'N/A'}%
- Temperature: ${telemetry.temperature ?? 'N/A'}°C
- Humidity: ${telemetry.humidity ?? 'N/A'}%
- Soil pH: ${telemetry.ph_level ?? telemetry.pH ?? telemetry.ph ?? 'N/A'}
- Nitrogen: ${telemetry.nitrogen ?? telemetry.n ?? 'N/A'} mg/kg
- Phosphorus: ${telemetry.phosphorus ?? telemetry.p ?? 'N/A'} mg/kg
- Potassium: ${telemetry.potassium ?? telemetry.k ?? 'N/A'} mg/kg
`;
  }

  let farmHistoryContext = '';
  if (farmHistory) {
    farmHistoryContext = `
Farm History:
- Previous Crop 1: ${farmHistory.crop_1_name || 'N/A'}
- Previous Crop 2: ${farmHistory.crop_2_name || 'N/A'}
`;
  }

  return [
    {
      role: "system",
      content: buildCompanionSystemPrompt(selectedLanguage)
    },
    {
      role: "user",
      content: `Current Crop: ${crop} | Growth Stage: ${stage}${telemetryContext}${farmHistoryContext}`
    }
  ];
};

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Hardcoded list of valid physical devices (used for Handshake Authentication)
const VALID_DEVICE_IDS = ['ESP32-AGRI-001', 'FARMER-NODE-A', 'DEMO-DEVICE', 'ESP1', 'B4:BF:E9:0A:8E:08'];

// Store connected devices: Map<deviceId, {ws, data, lastUpdate}>
const connectedDevices = new Map();

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection established');
  let deviceId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      // Handle device identification / auth handshake
      if (data.type === 'auth' || data.type === 'DEVICE_CONNECT') {
        const incomingId = data.deviceId || data.device || 'ESP1';
        
        if (VALID_DEVICE_IDS.includes(incomingId)) {
          deviceId = incomingId;
          connectedDevices.set(deviceId, {
            ws: ws,
            data: null,
            lastUpdate: Date.now(),
            connected: true
          });
          console.log(`✅ Device authenticated and registered: ${deviceId}`);
          // Support both new auth pattern and old connection pattern
          ws.send(JSON.stringify({ type: data.type === 'auth' ? 'auth_success' : 'CONNECTED', deviceId }));
        } else {
          console.log(`❌ Device connection rejected: Unrecognized ID [${incomingId}]`);
          ws.send(JSON.stringify({ type: 'auth_failed', error: 'Invalid Device ID' }));
          ws.close();
        }
        return;
      }
      
      // Handle sensor data
      if (data.type === 'SENSOR_DATA' || data.device || data.temperature !== undefined) {
        deviceId = data.deviceId || data.device || deviceId || 'ESP1';
        const enrichedData = enrichTelemetryWithMockSensors(data);
        const deviceInfo = connectedDevices.get(deviceId);

        if (deviceInfo) {
          deviceInfo.data = enrichedData;
          deviceInfo.lastUpdate = Date.now();
          console.log(`Data received from ${deviceId}:`, {
            temp: enrichedData.temperature,
            humidity: enrichedData.humidity,
            soil_moisture: enrichedData.soil_moisture ?? enrichedData.soilMoisture,
            mock_sensors: Boolean(enrichedData._mock_sensors_generated)
          });
        } else {
          if (VALID_DEVICE_IDS.includes(deviceId)) {
            connectedDevices.set(deviceId, {
              ws: ws,
              data: enrichedData,
              lastUpdate: Date.now(),
              connected: true
            });
            console.log(`✅ Device auto-registered: ${deviceId}`);
          } else {
            console.log(`❌ Ignored data from unauthorized device: ${deviceId}`);
          }
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
      console.log(`Device disconnected: ${deviceId}`);
    }
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// Middleware to parse JSON
app.use(cors());
app.use(express.json());

// ========================================
// API ROUTES (MUST BE BEFORE STATIC FILES)
// ========================================

// Test endpoint
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from your Azure-backed Node API!" });
});

/**
 * Device ID Authentication Endpoint for React Frontend
 * Validates the entered device ID against the authorized list.
 */
app.post("/api/auth-device", (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) {
    return res.status(400).json({ error: "Device ID is required" });
  }
  
  if (VALID_DEVICE_IDS.includes(deviceId)) {
    return res.json({ type: 'auth_success' });
  } else {
    return res.status(403).json({ type: 'auth_failed', error: 'Unrecognized Device ID' });
  }
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
 * Request sensor data from IoT device (ESP32) via WebSocket
 * Sends READ_SENSORS command; device reads sensors and pushes data back
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
    device.ws.send(JSON.stringify({
      type: 'READ_SENSORS',
      timestamp: Date.now()
    }));
    
    console.log(`Sent READ_SENSORS command to ${deviceId}`);
    
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

// ─── Auth + Profile Endpoints ─────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * - New username → auto-register and log in
 * - Existing username + correct password → log in
 * - Existing username + wrong password → 401 error
 */
app.post("/api/auth/login", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Database not connected' });
  }
  try {
    const { username, password } = req.body || {};
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username is required' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    const u = username.toLowerCase().trim();
    const existing = await UserProfile.findOne({ username: u });

    if (!existing) {
      // New user — create account
      await UserProfile.create({ username: u, password, crops: [], fertilizers: [], lastDevice: null });
      console.log(`✅ New user registered: ${u}`);
      return res.json({ success: true, created: true, username: u });
    }

    // Existing user — verify password
    if (existing.password !== password) {
      console.log(`❌ Wrong password for: ${u}`);
      return res.status(401).json({ success: false, error: 'Incorrect password' });
    }

    console.log(`✅ User logged in: ${u}`);
    return res.json({ success: true, created: false, username: u });
  } catch (err) {
    console.error('❌ POST /api/auth/login error:', err.message);
    res.status(500).json({ error: 'Auth failed' });
  }
});

/**
 * GET /api/profile/:username
 * Returns lastDevice, crops, fertilizers for the given user.
 */
app.get("/api/profile/:username", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Database not connected' });
  }
  try {
    const username = req.params.username.toLowerCase().trim();
    const profile = await UserProfile.findOne({ username });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json({
      username:    profile.username,
      lastDevice:  profile.lastDevice,
      crops:       profile.crops,
      fertilizers: profile.fertilizers,
      updatedAt:   profile.updatedAt
    });
  } catch (err) {
    console.error('❌ GET /api/profile error:', err.message);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

/**
 * POST /api/profile
 * Saves crops, fertilizers, and optionally lastDevice for a user.
 * Body: { username, crops, fertilizers, lastDevice? }
 */
app.post("/api/profile", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Database not connected' });
  }
  try {
    const { username, crops, fertilizers, lastDevice } = req.body || {};
    if (!username) {
      return res.status(400).json({ error: 'username is required' });
    }
    const u = username.toLowerCase().trim();
    const updateFields = {
      crops:       Array.isArray(crops)       ? crops       : [],
      fertilizers: Array.isArray(fertilizers) ? fertilizers : [],
      updatedAt:   new Date()
    };
    if (lastDevice !== undefined) updateFields.lastDevice = lastDevice;

    const profile = await UserProfile.findOneAndUpdate(
      { username: u },
      { $set: updateFields },
      { new: true }
    );
    if (!profile) {
      return res.status(404).json({ error: 'User not found. Login first.' });
    }
    console.log(`✅ Profile saved for: ${u}`);
    res.json({ success: true, updatedAt: profile.updatedAt });
  } catch (err) {
    console.error('❌ POST /api/profile error:', err.message);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});
// ──────────────────────────────────────────────────────────────────────────────

const callAgritechModel = async (messages) => {
  if (!azureAiEndpoint || !azureAiKey) {
    console.warn("⚠️ Azure AI service is not configured (keys missing). Using mock AI response for testing.");
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const userMessage = messages[messages.length - 1]?.content || '';
    const isMultiCrop = typeof userMessage === 'string' && (userMessage.includes('companion') || userMessage.includes('multi-crop'));

    const mockResponseText = isMultiCrop 
      ? `Based on your selected crop and field conditions, here are some highly recommended companion crops:

**1. Legumes (Beans/Peas)**
They act as natural nitrogen fixers, pulling nitrogen from the air and enriching the soil for your primary crop.

**2. Marigolds**
An excellent natural pest repellent that protects root systems from harmful nematodes.

**Planting Strategy:** Plant your primary crop in standard rows and intersperse legumes in the pathways. Use marigolds around the perimeter of the field.`
      : `### Soil Analysis & Recommendations

Based on the latest sensor readings and your specified crop stage, the field conditions are generally stable, but we detect a slight imbalance.

**1. Nutrient Adjustment**
Nitrogen levels are currently in the lower bound of the optimal range. We recommend applying a light top-dressing of nitrogen fertilizer (approx 15kg/hectare) in the next 3-4 days.

**2. Irrigation Planning**
Soil moisture is at a healthy 68%. Hold off on additional watering unless temperatures exceed 35°C in the next 48 hours.

**3. pH Management**
Your pH is 6.5, which is perfectly balanced for nutrient absorption. No amendments needed.`;

    return {
      text: mockResponseText,
      raw: { mocked: true }
    };
  }

  // If endpoint already contains /chat/completions, use it as-is; otherwise append it
  let url = azureAiEndpoint.replace(/\/$/, "");
  if (!url.includes('/chat/completions')) {
    url += '/chat/completions';
  }
  url += `?api-version=${azureAiApiVersion}`;

  console.log('Calling Azure AI model...');
  console.log(`Request: ${messages.length} messages, user prompt length: ${messages[messages.length-1]?.content?.length || 0}`);

  // Add 60-second timeout to prevent hanging requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": azureAiKey
      },
      body: JSON.stringify({
        messages,
        temperature: 0.4,
        max_tokens: 350
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Azure AI error (${response.status}):`, errorText);
      throw new Error(`Azure AI request failed (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    console.log('Azure AI raw response structure:', JSON.stringify(result, null, 2).substring(0, 500));
    
    const directContent = result?.output?.[0]?.content?.[0]?.text || result?.choices?.[0]?.message?.content;

    if (!directContent) {
      console.error('❌ Unexpected response format:', JSON.stringify(result, null, 2));
      throw new Error("Azure AI returned an unexpected response format");
    }

    console.log(`✅ AI response extracted (${directContent.length} chars)`);

    // Return text response directly (no JSON parsing)
    return {
      raw: directContent,
      text: directContent
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Azure AI request timed out after 60 seconds');
    }
    throw error;
  }
};

/**
 * Fetch weather data from Open-Meteo API
 * Historical window (7-14 days) + forecast window (7 days default)
 */
const fetchWeatherData = async (latitude, longitude) => {
  if (!latitude || !longitude || latitude === 0 || longitude === 0) {
    console.warn('⚠️ Invalid coordinates, using default (Central India)');
    latitude = 23.5;
    longitude = 77.0;
  }

  const today = new Date();
  const pastStart = new Date(today);
  pastStart.setDate(pastStart.getDate() - WEATHER_HISTORICAL_DAYS);
  const futureEnd = new Date(today);
  futureEnd.setDate(futureEnd.getDate() + WEATHER_FORECAST_DAYS);

  const startDate = pastStart.toISOString().split('T')[0];
  const endDate = futureEnd.toISOString().split('T')[0];

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&start_date=${startDate}&end_date=${endDate}&timezone=auto`;

  console.log(`Fetching weather for (${latitude}, ${longitude}) — ${WEATHER_HISTORICAL_DAYS}d history + ${WEATHER_FORECAST_DAYS}d forecast`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

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
      temp_max: daily.temperature_2m_max[idx] ?? 0,
      temp_min: daily.temperature_2m_min[idx] ?? 0,
      rain_mm: daily.precipitation_sum[idx] ?? 0,
      wind_speed: daily.windspeed_10m_max[idx] ?? 0
    }));

    const todayStr = today.toISOString().split('T')[0];
    const pastDays = allDays.filter(d => d.date < todayStr).slice(-WEATHER_HISTORICAL_DAYS);
    const nextDays = allDays.filter(d => d.date >= todayStr).slice(0, WEATHER_FORECAST_DAYS);
    const totalPastRainfallMm = pastDays.reduce((sum, d) => sum + (d.rain_mm || 0), 0);
    const avgPastTempMax = pastDays.length
      ? pastDays.reduce((sum, d) => sum + d.temp_max, 0) / pastDays.length
      : null;
    const forecastRainfallMm = nextDays.reduce((sum, d) => sum + (d.rain_mm || 0), 0);

    console.log(`✅ Weather: ${pastDays.length} past days, ${nextDays.length} forecast days (${totalPastRainfallMm.toFixed(1)} mm recent rain)`);

    return {
      pastDays,
      nextDays,
      past5Days: pastDays,
      next5Days: nextDays,
      summary: {
        historical_window_days: WEATHER_HISTORICAL_DAYS,
        forecast_window_days: WEATHER_FORECAST_DAYS,
        totalPastRainfallMm,
        avgPastTempMax,
        forecastRainfallMm
      }
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Weather API timed out');
    }
    throw error;
  }
};

app.post("/api/ai/analyze", async (req, res) => {
  console.log('\n=== AI Analysis Started ===');
  console.log('req.body:', req.body);
  
  try {
    const {
      mode,
      crop,
      stage,
      deviceId,
      telemetry: telemetryOverride,
      weather,
      cropType,
      cropStage,
      fieldArea,
      soilPH,
      language: lang,
      additionalQuery,
      farmHistory: farmHistoryInput
    } = req.body || {};

    const langMap = { 'hi': 'Hindi', 'ta': 'Tamil', 'en': 'English' };
    console.log(`Language: ${lang || 'en'} (${langMap[lang] || 'English'})`);

    // Shared Telemetry Lookup (Hoisted up for both modes)
    let telemetry = telemetryOverride;
    const resolvedDeviceId = deviceId || telemetry?.device || telemetry?.deviceId || telemetry?.deviceID || "";

    if (!telemetry && resolvedDeviceId) {
      const device = connectedDevices.get(resolvedDeviceId);
      if (device?.data) {
        telemetry = device.data;
      }
    }

    // Handle companion planting mode
    if (mode === 'companion') {
      console.log(`Mode: companion | Crop: ${crop} | Stage: ${stage}`);
      if (!crop || !stage) {
        return res.status(400).json({
          error: "Crop and stage are required for companion planting mode."
        });
      }

      const selectedLanguage = lang || 'en';
      const messages = buildCompanionMessages({ 
        crop, 
        stage, 
        language: selectedLanguage,
        telemetry,
        farmHistory: farmHistoryInput
      });
      
      console.log('Sending companion request to AI model...');
      const aiResult = await callAgritechModel(messages);
      
      console.log(`AI Response received (length: ${aiResult.text?.length || 0} chars)`);
      
      let cleanedText = aiResult.text.trim();
      if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "");
      }
      cleanedText = cleanedText.trim();

      let jsonResponse;
      try {
        jsonResponse = JSON.parse(cleanedText);
        // Normalize recommendation key if needed
        if (jsonResponse.companion_crop && !jsonResponse.recommendation) {
          jsonResponse.recommendation = jsonResponse.companion_crop;
        }
      } catch (err) {
        console.error("Failed to parse companion AI response as JSON, using fallback text:", cleanedText);
        jsonResponse = {
          recommendation: cleanedText,
          reason: selectedLanguage === 'hi' 
            ? "फसल जोड़ी का वैज्ञानिक विश्लेषण उपलब्ध नहीं है।" 
            : selectedLanguage === 'ta'
            ? "பயிர் இணையின் அறிவியல் பகுப்பாய்வு கிடைக்கவில்லை."
            : "Scientific analysis of companion crop pairing is not available.",
          benefits: selectedLanguage === 'hi'
            ? ["बेहतर पैदावार", "कीट नियंत्रण", "मिट्टी की उर्वरता में सुधार"]
            : selectedLanguage === 'ta'
            ? ["சிறந்த மகசூல்", "பூச்சி கட்டுப்பாடு", "மண் வளம் மேம்பாடு"]
            : ["Better yield", "Pest control", "Soil improvement"],
          warning: selectedLanguage === 'hi'
            ? "विकास और नमी के स्तर की नियमित निगरानी करें।"
            : selectedLanguage === 'ta'
            ? "வளர்ச்சி மற்றும் ஈரப்பதத்தை தொடர்ந்து கண்காணிக்கவும்."
            : "Monitor growth and moisture levels regularly."
        };
      }

      return res.json(jsonResponse);
    }

    // Telemetry is already looked up above.


    if (!telemetry) {
      return res.status(400).json({
        error: "Telemetry data is required. Provide telemetry in the request body or specify a deviceId with cached data."
      });
    }

    telemetry = normalizeTelemetry(telemetry);
    const { errors: validationErrors, farmHistory } = validateAssessmentPayload({
      telemetry,
      soilPH,
      farmHistoryInput
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: "Invalid assessment payload",
        details: validationErrors
      });
    }

    // Fetch real-time weather data from Open-Meteo
    let weatherData = { pastDays: [], nextDays: [], past5Days: [], next5Days: [], summary: {} };
    let weatherFetched = false;
    
    const lat = toNumberOrNull(telemetry?.latitude);
    const lon = toNumberOrNull(telemetry?.longitude);
    
    console.log(`Coordinates: lat=${lat}, lon=${lon}`);

    try {
      weatherData = await fetchWeatherData(lat, lon);
      weatherFetched = true;
      console.log('✅ Weather data fetched successfully');
    } catch (error) {
      console.warn('⚠️ Weather fetch failed, proceeding without weather:', error.message);
    }

    // Ensure language is properly set
    const selectedLanguage = lang || 'en';
    const langDisplay = { 'hi': 'HINDI', 'ta': 'TAMIL', 'en': 'ENGLISH' };
    console.log(`Selected Language: "${selectedLanguage}" -> ${langDisplay[selectedLanguage] || 'ENGLISH'}`);
    
    if (soilPH) {
      console.log(`Manual pH selected: ${soilPH}`);
    }
    
    const messages = buildAgritechMessages({
      telemetry,
      weather: weatherData,
      cropType,
      cropStage,
      fieldArea,
      soilPH,
      language: selectedLanguage,
      additionalQuery,
      farmHistory
    });
    
    console.log(`AI Prompt created with language: ${langDisplay[selectedLanguage] || 'English'}`);
    console.log(`System Prompt Preview: ${messages[0].content.substring(0, 150)}...`);
    console.log(`User Prompt Preview: ${messages[1].content.substring(0, 150)}...`);

    const aiResult = await callAgritechModel(messages);
    
    console.log(`AI Response received (length: ${aiResult.text?.length || 0} chars)`);
    console.log(`Preview: ${aiResult.text?.substring(0, 100)}...`);

    res.json({
      success: true,
      deviceId: resolvedDeviceId || telemetry.device || null,
      recommendation: aiResult.text,
      raw: aiResult.raw,
      weather_fetched: weatherFetched,
      weather_days: {
        past: weatherData.pastDays.length,
        forecast: weatherData.nextDays.length,
        historical_window: WEATHER_HISTORICAL_DAYS,
        forecast_window: WEATHER_FORECAST_DAYS
      },
      weather_summary: weatherData.summary || null,
      farm_history: farmHistory
    });
    
    console.log('=== AI Analysis Completed ===\n');
  } catch (error) {
    console.error("❌ AI analysis error:", error);
    console.error("Error stack:", error.stack);
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

// ========================================
// STATIC FILES (MUST BE AFTER API ROUTES)
// ========================================

// Serve static assets from the dist directory (Vite build output)
app.use(express.static(path.join(__dirname, "dist")));

// Support client-side routing by returning index.html for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Start server with WebSocket support
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`WebSocket server ready for device connections`);
});
