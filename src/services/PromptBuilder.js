/**
 * PromptBuilder — Structured Prompt Engine for Microstock Metadata
 */
export class PromptBuilder {
  static buildPrompt({ platform = 'generic', language = 'en', isEditorial = false } = {}) {
    return `Analyze the provided image and generate high-converting microstock metadata in ${language}.
Return a valid JSON object matching this schema:
{
  "title": "Clear, descriptive title (50-80 chars) without keyword stuffing",
  "description": "Detailed description of the image subject, environment, and context",
  "category": "Primary category name",
  "keywords": ["tag1", "tag2", "tag3", "tag4", ...],
  "isEditorial": ${isEditorial},
  "isAiGenerated": false
}`;
  }
}
