# Official Analysis & Documentation Validation: AI Provider Base URLs, Models, & Parameters
**Technical Analysis & Official Documentation Confirmation for Microstock AIO Metadata Browser Extension**  
*Date: September 1, 2026*

---

## 1. Summary & Official Validation

This document validates the Base URL configurations, models, and parameters based on **Official Developer Docs** from each AI provider combined with **live empirical request testing**:

1. **Universal OpenAI Compatibility Standard**:
   All major providers (Google Gemini, Mistral AI, Groq, OpenRouter, and OpenAI) officially provide REST API interfaces compatible with the OpenAI schema (`/v1/chat/completions` and `/v1/models`). The extension only requires a single universal HTTP client.

2. **Full Dynamic Model Fetching (`GET /models`)**:
   Per official specifications, the `/models` endpoint provides the live catalog of active models. The extension does not need artificial client-side filtering; all returned models will be displayed as-is in the dropdown options.

3. **Model Lifecycle & Deprecation Updates**:
   - **Mistral AI**: Official documentation notes that *Pixtral 12B* is deprecated and replaced by the **Ministral Series** (`ministral-3b`, `ministral-8b`, `ministral-14b`) and **Mistral Small / Large**, which feature *native multimodal vision* capabilities.
   - **Google Gemini**: *Gemini 2.0 Flash* has been replaced by the **Gemini 2.5 Flash / Lite** generation and the **Gemini 3.x Flash** series.
   - **OpenAI**: Reasoning series and new generation models (**GPT-5.x, GPT-5.4-nano/mini**) prohibit custom `temperature` values (only default 1.0 or omitted entirely), and require the new standard parameter `max_completion_tokens`.

---

## 2. Official Provider Table: Base URLs, Endpoints, & Documentation Sources

| Provider | Official Base URL (OpenAI-Compat) | Models Endpoint | Chat Completions Endpoint | Authentication | Official Documentation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **OpenRouter** | `https://openrouter.ai/api/v1` | `GET /models` | `POST /chat/completions` | `Bearer <KEY>` | [OpenRouter API Reference](https://openrouter.ai/docs/api-reference) |
| **OpenAI** | `https://api.openai.com/v1` | `GET /models` | `POST /chat/completions` | `Bearer <KEY>` | [OpenAI API Docs](https://platform.openai.com/docs/api-reference) |
| **Google Gemini** | `https://generativelanguage.googleapis.com/v1beta/openai` | `GET /models` | `POST /chat/completions` | `Bearer <KEY>` | [Gemini OpenAI Compatibility Guide](https://ai.google.dev/gemini-api/docs/openai) |
| **Groq** | `https://api.groq.com/openai/v1` | `GET /models` | `POST /chat/completions` | `Bearer <KEY>` | [Groq API & OpenAI Guide](https://console.groq.com/docs/openai) |
| **Mistral AI** | `https://api.mistral.ai/v1` | `GET /models` | `POST /chat/completions` | `Bearer <KEY>` | [Mistral API & Vision Docs](https://docs.mistral.ai/capabilities/vision/) |
| **Ollama (Local AI)** | `http://localhost:11434/v1` | `GET /models` | `POST /chat/completions` | *Optional* | [Ollama OpenAI Compatibility](https://github.com/ollama/ollama/blob/main/docs/openai.md) |
| **LM Studio (Local)** | `http://localhost:1234/v1` | `GET /models` | `POST /chat/completions` | *Optional* | [LM Studio Local Server Docs](https://lmstudio.ai/docs) |
| **Custom / Sniffox Proxy** | `https://<domain>/v1` | `GET /models` | `POST /chat/completions` | `Bearer <KEY>` | Follows standard OpenAI API spec |

---

## 3. Vision Model Landscape & Cost-Effective Recommendations

For microstock workflows (mass processing of dozens to hundreds of image files), the following models offer the highest speed, accuracy, and cost-efficiency:

### A. OpenAI
- **Primary Recommendations**:
  - `gpt-5.4-nano`: Nano-sized vision model, ultra-low latency, lowest cost per token.
  - `gpt-5.4-mini`: Excellent balance for visual keyword details.
  - `gpt-4.1-nano` / `gpt-4o-mini`: Very stable and proven cost-effective mini variants.
  - `gpt-5.6-sol`: High-performance new generation model.
- **Official Parameter Rules**:
  - `gpt-5.x` series & reasoning models (`o1`, `o3-mini`): **Omit the `temperature` parameter** from the payload (or set to 1.0). Sending `0.7` will be rejected by the API with `HTTP 400`.
  - Use `max_completion_tokens` (instead of legacy `max_tokens`).

### B. Google Gemini (via OpenAI Endpoint)
- **Primary Recommendations**:
  - `gemini-2.5-flash-lite` / `gemini-flash-lite-latest`: Most cost-effective with large daily free tier allowances.
  - `gemini-2.5-flash` / `gemini-flash-latest`: High-speed Flash model with sharp visual perception.
  - `gemini-3.1-flash-lite`, `gemini-3.6-flash`, `gemini-3.7-flash`: 3rd generation Flash models with deeper visual reasoning.
- **Official Parameter Rules**:
  - Supports `temperature` (0.0 - 2.0).
  - The `models/` prefix returned in `GET /models` IDs (e.g. `models/gemini-2.5-flash`) can be stripped in the UI for clean dropdown display.

### C. Mistral AI
- **Primary Recommendations**:
  - `ministral-3b-latest` / `ministral-3b-2512`: Ultra-efficient edge model with visual capabilities.
  - `ministral-8b-latest`: Cost-effective 8B parameter model.
  - `mistral-small-latest` / `mistral-small-2603`: Versatile multimodal model for commercial descriptions.
- **Official Parameter Rules**:
  - Supports `temperature: 0.0 - 1.0` and multimodal message format `{ type: "image_url", image_url: { url: "..." } }`.

### D. Groq
- **Primary Recommendations**:
  - `llama-3.2-11b-vision-preview` / active Llama multimodal variants on Groq LPU endpoints.
- **Official Parameter Rules**:
  - Maximum recommended Base64 payload up to ~4MB.
  - Ultra-high hardware LPU inference speed (hundreds of tokens per second).

### E. OpenRouter (Multi-Provider Catalog)
- **Primary Recommendations**:
  - `google/gemini-3.7-flash`, `deepseek/deepseek-v4-flash-vision-exp`, `qwen/qwen3.8-flash`.
  - Free tier models denoted by `:free` (e.g. `inclusionai/ling-3.0-flash-fin:free`, `nvidia/nemotron-3.5-lightning:free`).
- **Official Parameter Rules**:
  - Recommended optional headers: `HTTP-Referer` and `X-Title`.

---

## 4. Dynamic Model Fetching Mechanism (`GET /models`)

The extension calls the `/models` endpoint to populate dropdown options dynamically without client-side filtering:

```javascript
/**
 * Dynamically fetches all models from the provider
 * @param {string} baseUrl - Provider Base URL (e.g. https://api.openai.com/v1)
 * @param {string} apiKey - Provider API Key
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
export async function fetchProviderModels(baseUrl, apiKey) {
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  const url = `${cleanBaseUrl}/models`;
  
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(url, { method: 'GET', headers });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Fetch models failed (HTTP ${response.status}): ${errText}`);
  }

  const json = await response.json();
  const rawList = Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []);

  // Format into option list without filtering (all models displayed)
  return rawList.map(item => {
    const rawId = item.id || item.name || '';
    const cleanId = rawId.replace(/^models\//, ''); // Clean Gemini prefix if present
    return {
      id: cleanId,
      name: item.name || cleanId
    };
  });
}
```

---

## 5. Parameter Handler & Dynamic Payload Builder

To ensure full cross-model compatibility (especially the `temperature` restrictions in GPT-5 / reasoning models):

```javascript
/**
 * Builds request payload tailored to model specifications
 */
export function buildChatPayload({ model, prompt, imageBase64, temperature = 0.7, maxTokens = 500 }) {
  // GPT-5.x and reasoning models prohibit custom temperature values
  const isStrictTemperatureModel = /^(o1|o3|gpt-5)/i.test(model);
  
  const payload = {
    model: model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
              detail: "low" // Saves >90% tokens and prevents patch limit errors
            }
          }
        ]
      }
    ],
    max_completion_tokens: maxTokens
  };

  // Only append temperature if permitted by the model
  if (!isStrictTemperatureModel) {
    payload.temperature = temperature;
  }

  return payload;
}
```

---

## 6. Standard Metadata Output Prompt Format (JSON Schema)

The extension instructs the AI to always return data in a standard JSON format ready for direct platform form mapping:

```json
{
  "title": "Black Knight Chess Piece Icon Vector Illustration",
  "description": "Minimalist vector illustration of a black chess knight piece on isolated background, concept of strategy and tactical thinking.",
  "category": "Vectors",
  "keywords": [
    "chess",
    "knight",
    "strategy",
    "game",
    "tactics",
    "vector",
    "icon",
    "board game",
    "black",
    "piece"
  ]
}
```
