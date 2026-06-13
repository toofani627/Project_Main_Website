// Simple test to verify Azure AI connectivity
import 'dotenv/config';
import fetch from 'node-fetch';

const endpoint = process.env.AZURE_PHI4_ENDPOINT;
const apiKey = process.env.AZURE_PHI4_API_KEY;
const apiVersion = process.env.AZURE_PHI4_API_VERSION || '2024-05-01-preview';

console.log('\n🔍 AZURE AI CONFIGURATION TEST\n' + '='.repeat(60));
console.log('📍 Endpoint:', endpoint || '❌ NOT SET');
console.log('🔑 API Key:', apiKey ? `${apiKey.substring(0, 25)}...${apiKey.slice(-10)}` : '❌ NOT SET');
console.log('📅 API Version:', apiVersion);
console.log('='.repeat(60) + '\n');

if (!endpoint || !apiKey) {
  console.error('❌ Missing credentials!\n');
  process.exit(1);
}

// If endpoint already contains /chat/completions, use it as-is; otherwise append it
let url = endpoint.replace(/\/$/, '');
if (!url.includes('/chat/completions')) {
  url += '/chat/completions';
}
url += `?api-version=${apiVersion}`;
console.log('🌐 Testing URL:', url, '\n');

const testPayload = {
  messages: [
    {
      role: 'system',
      content: 'You are a helpful assistant. Always respond in JSON format.'
    },
    {
      role: 'user',
      content: 'Reply with {"status": "working", "test": "success"}'
    }
  ],
  temperature: 0.4,
  max_output_tokens: 100,
  response_format: { type: 'json_object' }
};

console.log('📤 Sending test request...\n');

try {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(testPayload)
  });

  console.log('📥 Response Status:', response.status, response.statusText);
  
  const responseText = await response.text();
  
  if (response.ok) {
    console.log('\n✅ SUCCESS! Azure AI is responding correctly.\n');
    console.log('Response preview:', responseText.substring(0, 500));
    
    try {
      const data = JSON.parse(responseText);
      console.log('\n📊 Parsed Response Structure:');
      console.log('  - Has output:', !!data.output);
      console.log('  - Has choices:', !!data.choices);
      if (data.output?.[0]?.content?.[0]?.text) {
        console.log('  - Content:', data.output[0].content[0].text);
      }
      if (data.choices?.[0]?.message?.content) {
        console.log('  - Content:', data.choices[0].message.content);
      }
    } catch (e) {
      console.log('  (Could not parse as JSON)');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ CONFIGURATION IS CORRECT!');
    console.log('='.repeat(60));
    process.exit(0);
  } else {
    console.log('\n❌ ERROR Response:');
    console.log(responseText);
    console.log('\n' + '='.repeat(60));
    console.log('❌ CONFIGURATION PROBLEM DETECTED');
    console.log('='.repeat(60));
    process.exit(1);
  }
} catch (error) {
  console.log('\n❌ REQUEST FAILED:');
  console.log('Error:', error.message);
  console.log('\n' + '='.repeat(60));
  console.log('❌ CANNOT REACH AZURE AI ENDPOINT');
  console.log('='.repeat(60));
  process.exit(1);
}
