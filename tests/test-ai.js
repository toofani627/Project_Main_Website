import fetch from "node-fetch";

async function test() {
  const azureAiEndpoint = "https://main-phi-4-resource-gro-resource.openai.azure.com/openai/deployments/phi-4";
  const azureAiKey = process.env.AZURE_AI_KEY; // Set via environment variable, never hardcode keys
  const azureAiApiVersion = "2024-05-01-preview";

  let url = azureAiEndpoint.replace(/\/$/, "");
  if (!url.includes('/chat/completions')) url += '/chat/completions';
  url += `?api-version=${azureAiApiVersion}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": azureAiKey },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hi" }],
        temperature: 0.4,
        max_tokens: 350
      })
    });
    console.log("Status:", response.status);
    console.log("Response:", await response.text());
  } catch (err) {
    console.error("Fetch error:", err);
  }
}
test();
