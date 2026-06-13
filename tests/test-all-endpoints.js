// Test multiple endpoint variations
import 'dotenv/config';
import fetch from 'node-fetch';

const baseEndpoint = process.env.AZURE_PHI4_ENDPOINT;
const apiKey = process.env.AZURE_PHI4_API_KEY;
const apiVersion = process.env.AZURE_PHI4_API_VERSION || '2024-05-01-preview';

console.log('\n🔍 TESTING MULTIPLE ENDPOINT VARIATIONS\n' + '='.repeat(60));

// Try different endpoint patterns
const testEndpoints = [
  // Original
  baseEndpoint,
  // Without /chat/completions (let code add it)
  baseEndpoint.replace('/chat/completions', ''),
  // With /openai/ path
  baseEndpoint.replace('/models/', '/openai/deployments/').replace('/chat/completions', ''),
  // Azure OpenAI style
  'https://main-phi-4-resource-gro-resource.openai.azure.com/openai/deployments/phi-4',
  'https://main-phi-4-resource-gro-resource.openai.azure.com/openai/deployments/phi-4-mini'
];

for (let i = 0; i < testEndpoints.length; i++) {
  if (!testEndpoints[i]) continue;
  
  let url = testEndpoints[i].replace(/\/$/, '');
  if (!url.includes('/chat/completions')) {
    url += '/chat/completions';
  }
  url += `?api-version=${apiVersion}`;
  
  console.log(`\n[Test ${i + 1}] ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are helpful. Reply in JSON only.' },
          { role: 'user', content: 'Say {"test": "pass"}' }
        ],
        temperature: 0.4,
        max_output_tokens: 50,
        response_format: { type: 'json_object' }
      })
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log('\n' + '='.repeat(60));
      console.log('✅ SUCCESS! WORKING ENDPOINT FOUND!');
      console.log('='.repeat(60));
      console.log(`\nUpdate your .env with:\nAZURE_PHI4_ENDPOINT=${testEndpoints[i]}\n`);
      process.exit(0);
    } else {
      const error = await response.text();
      console.log(`   Error: ${error.substring(0, 100)}`);
    }
  } catch (err) {
    console.log(`   Failed: ${err.message}`);
  }
}

console.log('\n' + '='.repeat(60));
console.log('❌ None of the tested endpoints worked.');
console.log('Please share the exact Target URI from Azure AI Foundry.');
console.log('='.repeat(60));
