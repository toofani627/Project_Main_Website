# IoT + AI Analysis System

A bilingual (English & Hindi) React web application for IoT device monitoring and AI-powered environmental data analysis.

## Features

- **Bilingual Support**: Complete UI translation between English and Hindi
- **Language Selection**: Users select their preferred language on first load
- **Device Control**: Monitor and control connected IoT devices via IP address
- **AI Analysis Dashboard**: 
  - Real-time environmental data display (Temperature, Humidity, Soil, Light, GPS)
  - Data export to JSON
  - Crop type selection (Wheat, Rice, Maize, Sugarcane, Cotton)
  - Soil pH scale visualization
  - Custom query input for AI analysis

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Backend**: Express.js (serves built React app)
- **State Management**: React Context API

## Project Structure

```
src/
├── components/
│   ├── LanguageSelect.jsx   # Initial language selection screen
│   ├── MainMenu.jsx          # Main menu with Device Control & AI Analysis options
│   └── AIAnalysis.jsx        # AI analysis dashboard
├── context/
│   └── LanguageContext.jsx   # Language state & translations
├── App.jsx                   # Main app with routing logic
├── main.jsx                  # React entry point
└── index.css                 # Tailwind CSS imports
```

## Getting Started

### Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run development server:
   ```bash
   npm run dev
   ```
   Opens at `http://localhost:3000`

### Production Build

1. Build the application:
   ```bash
   npm run build
   ```
   Creates optimized build in `dist/` folder

2. Preview production build locally:
   ```bash
   npm run preview
   ```

3. Run on production server (Azure):
   ```bash
   npm start
   ```
   Serves the built app via Express on port 3000 (or PORT env variable)

## Deployment to Azure

The project is configured for Azure App Service deployment via GitHub Actions:

1. Push code to `main` branch
2. GitHub Actions workflow (`.github/workflows/azure-deploy.yml`) automatically:
   - Installs dependencies
   - Builds the React app
   - Deploys to Azure Web App

### Required GitHub Secret

Set `AZURE_WEBAPP_PUBLISH_PROFILE` in GitHub repository secrets with your Azure Web App publish profile.

## Language Switching

Language preference is stored in `localStorage` and persists across sessions. The `LanguageContext` provides:

- `language`: Current language ('en' or 'hi')
- `changeLanguage(lang)`: Function to change language
- `t(key)`: Function to get translated text for any UI element

All translations are defined in `src/context/LanguageContext.jsx`.

## License

MIT
