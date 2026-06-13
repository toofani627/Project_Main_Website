// Test Both English and Hindi AI Analysis
import 'dotenv/config';
import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:3000';

console.log('🧪 Testing AI Analysis in BOTH Languages...\n');

const baseTestData = {
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
  additionalQuery: 'What should I do for better yield?'
};

async function testLanguage(language, languageName, emoji) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${emoji} Testing ${languageName.toUpperCase()} Analysis ${emoji}`);
  console.log('='.repeat(80));
  
  const testData = { ...baseTestData, language };
  
  console.log('📤 Request Data:');
  console.log('  Language:', language, `(${languageName})`);
  console.log('  Crop:', testData.cropType);
  console.log('  Stage:', testData.cropStage);
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
      console.error(`❌ ${languageName} request failed:`, response.status);
      console.error('Error:', errorText);
      return false;
    }

    const result = await response.json();
    
    console.log(`✅ ${languageName} Response received:\n`);
    console.log('─'.repeat(80));
    console.log(result.recommendation);
    console.log('─'.repeat(80));
    
    // Language detection
    const hasHindi = /[\u0900-\u097F]/.test(result.recommendation);
    const hasEnglish = /[a-zA-Z]/.test(result.recommendation);
    
    console.log('\n🔍 Language Detection:');
    console.log('  Contains Hindi (Devanagari):', hasHindi ? '✅ YES' : '❌ NO');
    console.log('  Contains English letters:', hasEnglish ? '✅ YES' : '❌ NO');
    
    let success = false;
    
    if (language === 'hi') {
      // Hindi test: should have Hindi, minimal English
      if (hasHindi && !hasEnglish) {
        console.log('\n🎉 PERFECT! Pure Hindi response! 🇮🇳');
        success = true;
      } else if (hasHindi && hasEnglish) {
        console.log('\n⚠️ WARNING: Mixed Hindi and English (acceptable but not ideal)');
        success = true;
      } else {
        console.log('\n❌ FAILED: No Hindi detected!');
        success = false;
      }
    } else {
      // English test: should have English, no Hindi
      if (hasEnglish && !hasHindi) {
        console.log('\n🎉 PERFECT! Pure English response! 🇬🇧');
        success = true;
      } else if (hasEnglish && hasHindi) {
        console.log('\n⚠️ WARNING: Mixed English and Hindi');
        success = false;
      } else {
        console.log('\n❌ FAILED: No English detected!');
        success = false;
      }
    }
    
    return success;
    
  } catch (error) {
    console.error(`❌ ${languageName} test error:`, error.message);
    return false;
  }
}

async function runTests() {
  const results = [];
  
  // Test English
  const englishSuccess = await testLanguage('en', 'English', '🇬🇧');
  results.push({ language: 'English', success: englishSuccess });
  
  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test Hindi
  const hindiSuccess = await testLanguage('hi', 'Hindi', '🇮🇳');
  results.push({ language: 'Hindi', success: hindiSuccess });
  
  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${result.language}: ${status}`);
  });
  
  const allPassed = results.every(r => r.success);
  
  if (allPassed) {
    console.log('\n🎉 ALL TESTS PASSED! Both languages working correctly! 🎉');
    process.exit(0);
  } else {
    console.log('\n❌ SOME TESTS FAILED! Check the output above.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test suite error:', error);
  console.error('\n💡 Make sure the server is running: npm run dev');
  process.exit(1);
});
