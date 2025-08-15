
import { useState, useEffect } from 'react';

export interface LLMProvider {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface LLMProviders {
  openai?: LLMProvider;
  meta?: LLMProvider;
  gemini?: LLMProvider;
  deepseek?: LLMProvider;
  ollama?: LLMProvider;
  custom?: LLMProvider;
}

export type ProviderType = keyof LLMProviders;

const STORAGE_KEYS = {
  providers: 'zllm.providers',
  activeProvider: 'zllm.activeProvider',
  coreLaws: 'zandalee_core_laws.json'
};

export const useLLMProviders = () => {
  const [providers, setProviders] = useState<LLMProviders>({});
  const [activeProvider, setActiveProvider] = useState<ProviderType>('openai');
  const [coreLaws, setCoreLaws] = useState<string>('{}');

  // Load from localStorage on mount
  useEffect(() => {
    const savedProviders = localStorage.getItem(STORAGE_KEYS.providers);
    const savedActiveProvider = localStorage.getItem(STORAGE_KEYS.activeProvider);
    const savedCoreLaws = localStorage.getItem(STORAGE_KEYS.coreLaws);

    if (savedProviders) {
      try {
        setProviders(JSON.parse(savedProviders));
      } catch (e) {
        console.error('Failed to parse saved providers:', e);
      }
    }

    if (savedActiveProvider) {
      setActiveProvider(savedActiveProvider as ProviderType);
    }

    if (savedCoreLaws) {
      setCoreLaws(savedCoreLaws);
    }
  }, []);

  const updateProvider = (type: ProviderType, config: LLMProvider) => {
    const newProviders = { ...providers, [type]: config };
    setProviders(newProviders);
    localStorage.setItem(STORAGE_KEYS.providers, JSON.stringify(newProviders));
  };

  const setActive = (type: ProviderType) => {
    setActiveProvider(type);
    localStorage.setItem(STORAGE_KEYS.activeProvider, type);
  };

  const updateCoreLaws = (laws: string) => {
    setCoreLaws(laws);
    localStorage.setItem(STORAGE_KEYS.coreLaws, laws);
  };

  const validateCoreLaws = (laws: string): boolean => {
    try {
      JSON.parse(laws);
      return true;
    } catch {
      return false;
    }
  };

  return {
    providers,
    activeProvider,
    coreLaws,
    updateProvider,
    setActive,
    updateCoreLaws,
    validateCoreLaws,
    getActiveConfig: () => providers[activeProvider]
  };
};
