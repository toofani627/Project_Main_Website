# ESP32 IoT Device Integration Guide

## Overview

This document explains how the **ESP32** field unit integrates with the Azure-hosted React website using **outbound WebSockets**. The ESP32 is the supported hardware platform; legacy ESP8266 HTTP polling (`?deviceIP=`, `/api/device-data`) has been removed.

## Architecture

```
ESP32 (Home Network)
     │  WebSocket Client (TLS/WSS)
     ▼
Azure / Local Node Server (server.js)
     ▲
     │  REST API
React Dashboard (AIAnalysis.jsx)
```

### Connection flow

1. ESP32 connects **outbound** to the server WebSocket endpoint (no port forwarding).
2. ESP32 sends `DEVICE_CONNECT` with its `deviceId`.
3. User opens the dashboard with `?device_id=ESP32_FIELD_UNIT_1` (or enters ID manually).
4. User clicks **Get Data** → server sends `READ_SENSORS` → ESP32 reads sensors and pushes JSON.
5. Server enriches real `soil_moisture` with model-estimated N/P/K, pH, and EC for the UI and AI pipeline.

## ESP32 telemetry payload

Minimum sensor message from the field unit:

```json
{
  "deviceId": "ESP32_FIELD_UNIT_1",
  "temperature": 28.2,
  "humidity": 65.4,
  "soil_moisture": 42.1
}
```

After server enrichment (stored in memory and returned by `/api/device-data-ws`):

```json
{
  "deviceId": "ESP32_FIELD_UNIT_1",
  "temperature": 28.2,
  "humidity": 65.4,
  "soil_moisture": 42.1,
  "nitrogen": 42.0,
  "phosphorus": 23.2,
  "potassium": 141.0,
  "ph_level": 6.1,
  "electrical_conductivity": 1.05,
  "_mock_sensors_generated": true
}
```

Optional fields: `latitude`, `longitude` (improves weather lookup for AI analysis).

## Firmware requirements

### 1. WebSocket connect

```cpp
// Example: connect to Azure App Service (WSS on 443)
webSocket.beginSSL("your-app.azurewebsites.net", 443, "/");
```

### 2. Device registration

```json
{"type":"DEVICE_CONNECT","deviceId":"ESP32_FIELD_UNIT_1"}
```

### 3. Handle READ_SENSORS

On receiving `{"type":"READ_SENSORS","timestamp":...}`:

- Read temperature, humidity, soil moisture from sensors.
- Send JSON payload (see minimum telemetry above) via WebSocket.

### 4. Redirect URL (optional)

ESP32 captive portal or setup page can redirect farmers to:

```
https://your-app.azurewebsites.net/?device_id=ESP32_FIELD_UNIT_1
```

The dashboard captures `device_id` into `localStorage` — **not** `deviceIP`.

## React website integration

| Component | Role |
|-----------|------|
| `src/components/AIAnalysis.jsx` | Device ID UI, Get Data, sensor table, AI form |
| `server.js` | WebSocket hub, `READ_SENSORS`, mock sensor engine, AI API |

### Get Data sequence (frontend)

```javascript
await fetch(`/api/request-data?device=${deviceId}`, { method: 'POST' });
await new Promise((r) => setTimeout(r, 2000));
const response = await fetch(`/api/device-data-ws?device=${deviceId}`);
const data = await response.json();
```

## API endpoints (WebSocket-backed)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/request-data?device=` | Send `READ_SENSORS` to ESP32 |
| `GET` | `/api/device-data-ws?device=` | Latest cached telemetry |
| `GET` | `/api/devices` | List connected WebSocket devices |
| `POST` | `/api/ai/analyze` | AI crop recommendations |

## Local testing

```bash
# Terminal 1 — backend
npm start

# Terminal 2 — simulate ESP32
npx wscat -c ws://localhost:3000
```

Send:

```json
{"type":"DEVICE_CONNECT","deviceId":"ESP32_FIELD_UNIT_1"}
{"deviceId":"ESP32_FIELD_UNIT_1","temperature":28.2,"humidity":65.4,"soil_moisture":42.1}
```

Verify:

```bash
curl "http://localhost:3000/api/device-data-ws?device=ESP32_FIELD_UNIT_1"
```

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Device not connected | Serial monitor shows WSS connected; `deviceId` matches dashboard |
| Device offline | WebSocket dropped — reset ESP32; confirm Wi-Fi |
| No data yet | Click Get Data after connect; wait for `READ_SENSORS` round-trip |
| Mock NPK missing | Payload must include `soil_moisture` |

## Security notes

- WebSocket uses TLS (WSS) in production.
- Device ID is a lightweight identifier — add authentication for production hardening.
- No HTTP device proxy; all telemetry flows through WebSocket.

## Related docs

- `WEBSOCKET_SETUP.md` — detailed WebSocket setup and API reference
