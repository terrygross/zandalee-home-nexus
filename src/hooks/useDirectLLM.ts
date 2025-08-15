
import { useLLMProviders, type ProviderType, type LLMProvider } from './useLLMProviders';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export const useDirectLLM = () => {
  const { providers, activeProvider, coreLaws } = useLLMProviders();

  const sendMessage = async (messages: ChatMessage[]): Promise<string> => {
    const config = providers[activeProvider];
    if (!config?.apiKey) {
      throw new Error(`No API key configured for ${activeProvider}`);
    }

    // Add core laws as system message if available
    const systemMessage = getSystemMessage();
    const messagesWithSystem = systemMessage 
      ? [systemMessage, ...messages]
      : messages;

    switch (activeProvider) {
      case 'openai':
        return await callOpenAI(config, messagesWithSystem);
      case 'deepseek':
        return await callDeepSeek(config, messagesWithSystem);
      case 'custom':
        return await callCustomOpenAI(config, messagesWithSystem);
      case 'gemini':
        return await callGemini(config, messagesWithSystem);
      case 'meta':
        return await callMeta(config, messagesWithSystem);
      case 'ollama':
        return await callOllama(config, messagesWithSystem);
      default:
        throw new Error(`Provider ${activeProvider} not implemented`);
    }
  };

  const getSystemMessage = (): ChatMessage | null => {
    try {
      const laws = JSON.parse(coreLaws);
      if (Object.keys(laws).length === 0) return null;
      
      const systemPrompt = `You are Zandalee, a family desktop AI assistant. Your core laws and principles are: ${JSON.stringify(laws, null, 2)}. Follow these laws in all your responses.`;
      
      return {
        role: 'system',
        content: systemPrompt
      };
    } catch {
      return null;
    }
  };

  const callOpenAI = async (config: LLMProvider, messages: ChatMessage[]): Promise<string> => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model || 'gpt-3.5-turbo',
        messages,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No response';
  };

  const callDeepSeek = async (config: LLMProvider, messages: ChatMessage[]): Promise<string> => {
    const baseUrl = config.baseUrl || 'https://api.deepseek.com';
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model || 'deepseek-chat',
        messages,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No response';
  };

  const callCustomOpenAI = async (config: LLMProvider, messages: ChatMessage[]): Promise<string> => {
    if (!config.baseUrl) {
      throw new Error('Base URL required for custom OpenAI-compatible provider');
    }

    const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`Custom API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No response';
  };

  const callGemini = async (config: LLMProvider, messages: ChatMessage[]): Promise<string> => {
    // Convert messages to Gemini format
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model || 'gemini-pro'}:generateContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
  };

  const callMeta = async (config: LLMProvider, messages: ChatMessage[]): Promise<string> => {
    // Assuming Meta Llama is available through an OpenAI-compatible endpoint
    const baseUrl = config.baseUrl || 'https://api.together.xyz';
    return await callCustomOpenAI({ ...config, baseUrl }, messages);
  };

  const callOllama = async (config: LLMProvider, messages: ChatMessage[]): Promise<string> => {
    const baseUrl = config.baseUrl || 'http://localhost:11434';
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model || 'llama2',
        messages,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.message?.content || 'No response';
  };

  return {
    sendMessage,
    activeProvider,
    isConfigured: () => !!providers[activeProvider]?.apiKey
  };
};
