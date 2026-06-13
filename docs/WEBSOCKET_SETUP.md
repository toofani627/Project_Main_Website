# WebSocket Setup Guide — ESP32

## What was implemented

**Reverse WebSocket** architecture: the ESP32 initiates an outbound connection to the server. No port forwarding, ngrok, or HTTP device polling required.

### Architecture

```
ESP32 (Home Network) → WebSocket Client (WSS) → Azure / Node Server (Public)
                                                        ↑
React App (Browser) → REST /api/* ──────────────────────┘
                              READ_SENSORS command via WebSocket
```

### Why this works

- ESP32 connects **out** from the home network (routers allow outbound TLS).
- The server is publicly reachable; the React app calls REST APIs only.
- Sensors are read **on demand** when the user clicks Get Data (saves power).
- Hardware-agnostic protocol: `DEVICE_CONNECT`, `READ_SENSORS`, sensor JSON.

---

## ESP32 setup

### Step 1: Install WebSocketsClient

In Arduino IDE: **Sketch → Include Library → Manage Libraries** → install **WebSockets by Markus Sattler** (2.3.6+).

### Step 2: Configure firmware

1. Set Wi-Fi credentials and unique `deviceId` (e.g. `ESP32_FIELD_UNIT_1`).
2. Point WebSocket host to your deployment:
   ```cpp
   const char* wsHost = "firstaiproject-b3a0ggccafdveyg8.centralindia-01.azurewebsites.net";
   ```
3. Upload to ESP32 and open Serial Monitor (115200 baud).

### Step 3: Verify connection

Expected serial output:

```
✓ Wi-Fi connected
🌐 Connecting to WebSocket server...
✅ WebSocket Connected!
📤 Sent DEVICE_CONNECT: ESP32_FIELD_UNIT_1
```

---

## Dashboard usage

1. Open the site (local: `http://localhost:3000` or Azure URL).
2. Use redirect `?device_id=ESP32_FIELD_UNIT_1` or enter the ID manually.
3. Click **Get Data** on the AI Analysis page.
4. View telemetry in the Device Information table (moisture real; N/P/K/pH/EC model-enriched).

---

## How it works (technical)

### 1. ESP32 connects to server

```cpp
webSocket.beginSSL(wsHost, 443, "/");
webSocket.sendTXT("{\"type\":\"DEVICE_CONNECT\",\"deviceId\":\"ESP32_FIELD_UNIT_1\"}");
```

### 2. User clicks Get Data

```javascript
fetch('/api/request-data?device=ESP32_FIELD_UNIT_1', { method: 'POST' });
```

### 3. Server sends READ_SENSORS

```javascript
device.ws.send(JSON.stringify({ type: 'READ_SENSORS', timestamp: Date.now() }));
```

### 4. ESP32 reads and sends telemetry

```json
{
  "deviceId": "ESP32_FIELD_UNIT_1",
  "temperature": 28.2,
  "humidity": 65.4,
  "soil_moisture": 42.1
}
```

Server runs `enrichTelemetryWithMockSensors()` when `soil_moisture` is present.

### 5. Frontend fetches cached data

```javascript
const response = await fetch('/api/device-data-ws?device=ESP32_FIELD_UNIT_1');
const data = await response.json();
```

---

## API endpoints

### POST /api/request-data?device={id}

Sends `READ_SENSORS` to the ESP32 via WebSocket.

```json
{ "success": true, "message": "Data request sent to device", "deviceId": "ESP32_FIELD_UNIT_1" }
```

### GET /api/device-data-ws?device={id}

Returns latest enriched telemetry from the in-memory device cache.

### GET /api/devices

Lists all WebSocket-connected devices and connection status.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Device not connected | Check serial log for WSS success; verify `deviceId` matches dashboard |
| Device offline | Power-cycle ESP32; check Wi-Fi signal |
| No data yet | Click Get Data after connect; confirm `READ_SENSORS` handler in firmware |
| Zero moisture | Check soil sensor wiring and `soil_moisture` field name in JSON |

### Local simulation (no hardware)

```bash
npx wscat -c ws://localhost:3000
```

```json
{"type":"DEVICE_CONNECT","deviceId":"ESP32_FIELD_UNIT_1"}
{"deviceId":"ESP32_FIELD_UNIT_1","temperature":28.2,"humidity":65.4,"soil_moisture":42.1}
```

---

## Multiple devices

Use a unique `deviceId` per ESP32 and matching `?device_id=` in the dashboard URL:

```
ESP32_FIELD_UNIT_1
ESP32_FIELD_UNIT_2
```

---

## Security notes

- WSS/TLS encrypts device-to-server traffic in production.
- Consider adding a shared secret on `DEVICE_CONNECT` for production deployments.
- Legacy HTTP routes (`/api/device-data?ip=`, `?deviceIP=`) are removed — WebSocket only.

---

## Related docs

- `ESP32_INTEGRATION.md` — payload formats and React integration
