// Quick Azure AI Diagnostic Script
import 'dotenv/config';

const endpoint = process.env.AZURE_PHI4_ENDPOINT;
const apiKey = process.env.AZURE_PHI4_API_KEY;
const apiVersion = process.env.AZURE_PHI4_API_VERSION || '2024-05-01-preview';

console.log('🔍 Testing Azure AI Configuration...\n');
console.log('📍 Endpoint:', endpoint || '❌ NOT SET');
console.log('🔑 API Key:', apiKey ? `${apiKey.substring(0, 20)}...` : '❌ NOT SET');
console.log('📅 API Version:', apiVersion);
console.log('\n' + '='.repeat(60) + '\n');

if (!endpoint || !apiKey) {
  console.error('❌ Missing credentials in .env file!');
  console.log('\nRequired variables:');
  console.log('  - AZURE_PHI4_ENDPOINT');
  console.log('  - AZURE_PHI4_API_KEY');
  process.exit(1);
}

// Test different endpoint formats
const testEndpoints = [
  // Original endpoint
  `${endpoint.replace(/\/$/, '')}/chat/completions`,
  // Without /api/projects path
  `${endpoint.split('/api/projects')[0]}/chat/completions`,
  // Direct chat completions
  endpoint.includes('/chat/completions') ? endpoint : null
].filter(Boolean);

console.log('🧪 Testing endpoint formats:\n');

for (let i = 0; i < testEndpoints.length; i++) {
  const testUrl = `${testEndpoints[i]}?api-version=${apiVersion}`;
  console.log(`\n[${i + 1}] ${testUrl}`);
  
  try {
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant. Reply in JSON format only.'
          },
          {
            role: 'user',
            content: 'Say {"test": "success"} if you can hear me.'
          }
        ],
        temperature: 0.4,
        max_output_tokens: 100,
        response_format: { type: 'json_object' }
      })
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ SUCCESS! Response:', JSON.stringify(data).substring(0, 200));
      console.log('\n' + '='.repeat(60));
      console.log('✅ WORKING ENDPOINT FOUND!');
      console.log('\nUpdate your .env file with:');
      console.log(`AZURE_PHI4_ENDPOINT=${testEndpoints[i].replace('/chat/completions', '')}`);
      console.log('='.repeat(60));
      process.exit(0);
    } else {
      const errorText = await response.text();
      console.log(`   ❌ Error: ${errorText.substring(0, 150)}`);
    }
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
  }
}

console.log('\n' + '='.repeat(60));
console.log('❌ No working endpoint found!');
console.log('\n💡 Common issues:');
console.log('  1. Endpoint needs /deployments/<deployment-name> in the path');
console.log('  2. Using AI Foundry project endpoint instead of model endpoint');
console.log('  3. Wrong API key or expired credentials');
console.log('\n📚 How to find the correct endpoint:');
console.log('  1. Go to Azure AI Foundry portal');
console.log('  2. Open your project → Deployments');
console.log('  3. Click your Phi-4 deployment');
console.log('  4. Copy the "Target URI" or "Endpoint"');
console.log('='.repeat(60));
