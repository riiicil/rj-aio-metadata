/**
 * AiVisionService — Universal OpenAI-Compatible Multimodal Vision Client
 */
export class AiVisionService {
  /**
   * Generates microstock metadata using any OpenAI-compatible Vision endpoint.
   * @param {Object} params
   * @param {string} params.baseUrl
   * @param {string} params.apiKey
   * @param {string} params.modelId
   * @param {string} params.base64Image
   * @param {string} params.prompt
   * @returns {Promise<Object>}
   */
  static async generateMetadata({ baseUrl, apiKey, modelId, base64Image, prompt }) {
    const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          {
            role: 'system',
            content: 'You are an expert microstock metadata specialist. Return JSON format only.'
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
            ]
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Vision API Error (${response.status}): ${errText}`);
    }

    const result = await response.json();
    return JSON.parse(result.choices[0].message.content);
  }
}
