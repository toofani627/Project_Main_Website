# Using ngrok to Make ESP8266 Accessible

## What is ngrok?
ngrok creates a secure tunnel from a public URL to your local ESP8266, making it accessible from anywhere (including Azure).

## Setup Steps:

### 1. Download ngrok
- Visit: https://ngrok.com/download
- Sign up for free account
- Download ngrok for Windows

### 2. Install and Authenticate
```powershell
# Extract ngrok.exe to a folder, then:
.\ngrok authtoken YOUR_AUTH_TOKEN_FROM_NGROK_DASHBOARD
```

### 3. Create Tunnel to ESP8266
```powershell
# Run this command (replace 192.168.1.7 with your ESP IP)
.\ngrok http 192.168.1.7:80
```

### 4. You'll see output like:
```
Forwarding   https://abcd-1234-5678.ngrok.io -> http://192.168.1.7:80
```

### 5. Update Frontend Code
Use the ngrok HTTPS URL as your device IP:
- Instead of: `192.168.1.7`
- Use: `abcd-1234-5678.ngrok.io` (without http://)

### 6. Modify AIAnalysis.jsx
The frontend needs to handle ngrok domains properly.

## Limitations:
- Free ngrok URLs change each time you restart
- Need to keep ngrok running while testing
- 40 requests/minute limit on free tier

## Production Alternative:
For production, consider:
1. Use a VPS/Cloud VM in same region as Azure
2. Deploy ESP8266 code to cloud IoT service
3. Use Azure IoT Hub for device communication
