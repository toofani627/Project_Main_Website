// Test Hindi AI Analysis
import 'dotenv/config';
import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:3000';

console.log('🧪 Testing Hindi AI Analysis...\n');

const testData = {
  deviceId: 'TEST_ESP',
  telemetry: {
    device: 'TEST_ESP',
    temperature: 28.5,
    humidity: 65,
    soilMoisture: 42,
    pH: 6.8,
    lightLevel: 750,
    latitude: 23.5,
    longitude: 77.0,
    timestamp: new Date().toISOString()
  },
  cropType: 'wheat',
  cropStage: 'vegetative',
  fieldArea: 2.5,
  language: 'hi', // HINDI
  additionalQuery: 'What should I do for better yield?'
};

console.log('📤 Request Data:');
console.log('  Language:', testData.language, '(Hindi)');
console.log('  Crop:', testData.cropType);
console.log('  Stage:', testData.cropStage);
console.log('  Field Area:', testData.fieldArea, 'hectares');
console.log('\n⏳ Sending request...\n');

try {
  const response = await fetch(`${SERVER_URL}/api/ai/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(testData)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Request failed:', response.status);
    console.error('Error:', errorText);
    process.exit(1);
  }

  const result = await response.json();
  
  console.log('✅ SUCCESS! AI Response received:\n');
  console.log('─'.repeat(80));
  console.log(result.recommendation);
  console.log('─'.repeat(80));
  console.log('\n📊 Response Details:');
  console.log('  Device ID:', result.deviceId);
  console.log('  Weather Fetched:', result.weather_fetched);
  console.log('  Response Length:', result.recommendation.length, 'characters');
  
  // Check if response is in Hindi (contains Devanagari characters)
  const hasHindi = /[\u0900-\u097F]/.test(result.recommendation);
  const hasEnglish = /[a-zA-Z]/.test(result.recommendation);
  
  console.log('\n🔍 Language Detection:');
  console.log('  Contains Hindi (Devanagari):', hasHindi ? '✅ YES' : '❌ NO');
  console.log('  Contains English:', hasEnglish ? '⚠️ YES (should be minimal)' : '✅ NO');
  
  if (hasHindi && !hasEnglish) {
    console.log('\n🎉 PERFECT! Response is in pure Hindi! 🇮🇳');
  } else if (hasHindi && hasEnglish) {
    console.log('\n⚠️ WARNING: Response contains both Hindi and English (mixed)');
  } else if (!hasHindi) {
    console.log('\n❌ ERROR: Response is NOT in Hindi!');
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('\n💡 Make sure the server is running: npm run dev');
  process.exit(1);
}
