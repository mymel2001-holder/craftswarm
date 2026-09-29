export class LLMProvider {
  constructor(config) {
    this.config = config;
  }

  async decide({ system, messages, tools }) {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({ model: this.config.model, temperature: 0.2, stream: false, messages: [{ role: 'system', content: system }, ...messages], tools, tool_choice: 'auto' })
    });
    if (!response.ok) throw new Error(`LLM HTTP ${response.status}: ${await response.text()}`);
    const payload = await response.json();
    const message = payload.choices?.[0]?.message;
    if (!message) throw new Error('LLM response has no message.');
    return message;
  }
}
