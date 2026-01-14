import React, { useState } from 'react';
import { Send, Loader2, Settings, X, Eye, EyeOff } from 'lucide-react';
import './App.css';
import Markdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type ModelName = 'claude' | 'chatgpt' | 'gemini' | 'grok';

interface ModelConfig {
  name: string;
  gradient: string;
  apiKeyLabel: string;
  placeholder: string;
  helpUrl: string;
}

interface ModelHandler {
  config: ModelConfig;
  callAPI: (prompt: string, apiKey: string) => Promise<string>;
}

const modelConfigs: Record<ModelName, ModelConfig> = {
  claude: {
    name: 'Claude',
    gradient: 'purple-blue',
    apiKeyLabel: 'Anthropic API Key',
    placeholder: 'sk-ant-...',
    helpUrl: 'console.anthropic.com'
  },
  chatgpt: {
    name: 'ChatGPT',
    gradient: 'green-teal',
    apiKeyLabel: 'OpenAI API Key',
    placeholder: 'sk-...',
    helpUrl: 'platform.openai.com'
  },
  gemini: {
    name: 'Gemini',
    gradient: 'blue-cyan',
    apiKeyLabel: 'Google AI API Key',
    placeholder: 'AIza...',
    helpUrl: 'makersuite.google.com/app/apikey'
  },
  grok: {
    name: 'Grok',
    gradient: 'black-gray',
    apiKeyLabel: 'xAI API Key',
    placeholder: 'xai-...',
    helpUrl: 'console.x.ai/home'
  }
};

const modelHandlers: Record<ModelName, ModelHandler> = {
  claude: {
    config: modelConfigs.claude,
    callAPI: async (prompt: string, apiKey: string) => {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.content[0].text;
    }
  },

  chatgpt: {
    config: modelConfigs.chatgpt,
    callAPI: async (prompt: string, apiKey: string) => {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-5-nano',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    }
  },

  gemini: {
    config: modelConfigs.gemini,
    callAPI: async (prompt: string, apiKey: string) => {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    }
  },
  grok: {
    config: modelConfigs.grok,
    callAPI: async (prompt: string, apiKey: string) => {
      const response = await fetch(
        `https://api.x.ai/v1/responses`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            input: [
              {
                role: "system",
                content: "You are Grok, an extremely intelligent, helpful AI assistant."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            model: "grok-4"
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.output[0].content[0].text;
    }
  }
};

const createModelState = <T,>(initialValue: T): Record<ModelName, T> => ({
  claude: initialValue,
  chatgpt: initialValue,
  gemini: initialValue,
  grok: initialValue
});

export default function MultiModelChat() {
  const [prompt, setPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<ModelName>('claude');
  const [showSettings, setShowSettings] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState(createModelState(false));
  const [apiKeys, setApiKeys] = useState(createModelState(''));
  const [tempApiKeys, setTempApiKeys] = useState(createModelState(''));
  const [messages, setMessages] = useState(createModelState<Message[]>([]));
  const [loading, setLoading] = useState(createModelState(false));
  const [errors, setErrors] = useState(createModelState(''));

  const modelNames = Object.keys(modelHandlers) as ModelName[];

  const openSettings = () => {
    setTempApiKeys({ ...apiKeys });
    setShowSettings(true);
  };

  const saveSettings = () => {
    setApiKeys({ ...tempApiKeys });
    setShowSettings(false);
  };

  const handleModelAPICall = async (model: ModelName, userPrompt: string) => {
    setLoading(prev => ({ ...prev, [model]: true }));

    try {
      if (!apiKeys[model]) {
        throw new Error(`${modelConfigs[model].name} API key not set. Please configure it in settings.`);
      }

      const response = await modelHandlers[model].callAPI(userPrompt, apiKeys[model]);
      const assistantMessage: Message = { role: 'assistant', content: response };

      setMessages(prev => ({
        ...prev,
        [model]: [...prev[model], assistantMessage]
      }));
    } catch (err) {
      setErrors(prev => ({
        ...prev,
        [model]: err instanceof Error ? err.message : 'An error occurred'
      }));
    } finally {
      setLoading(prev => ({ ...prev, [model]: false }));
    }
  };

  const handleSubmit = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!prompt.trim() || Object.values(loading).some(l => l)) return;

    const userMessage: Message = { role: 'user', content: prompt };

    setMessages(prev =>
      Object.fromEntries(
        modelNames.map(model => [model, [...prev[model], userMessage]])
      ) as Record<ModelName, Message[]>
    );

    const currentPrompt = prompt;
    setPrompt('');
    setErrors(createModelState(''));

    modelNames.forEach(model => apiKeys[model] && handleModelAPICall(model, currentPrompt));
  };

  const isAnyLoading = Object.values(loading).some(l => l);
  const isAnyReady = Object.values(apiKeys).some(l => l);

  return (
    <div className="app-container">
      <div className="main-card">
        <div className="header">
          <div>
            <h1 className="header-title">AI Aggregate</h1>
            <p className="header-subtitle">Compare responses from different AI sources</p>
          </div>
          <button onClick={openSettings} className="settings-button">
            <Settings size={24} />
          </button>
        </div>

        <div className="tabs-container" >
          {modelNames.map((model) => (
            <button
              hidden={!apiKeys[model]}
              key={model}
              onClick={() => setActiveTab(model)}
              className={`tab ${activeTab === model ? 'tab-active' : ''}`}
            >
              <div className="tab-content">
                <span>{modelConfigs[model].name}</span>
                {loading[model] && <Loader2 size={16} className="spinner" />}
                {!apiKeys[model] && <span className="tab-badge">No API Key</span>}
              </div>
              {
                activeTab === model && (
                  <div className={`tab-indicator gradient-${modelConfigs[model].gradient}`} />
                )
              }
            </button>
          ))}
        </div>

        <div className="chat-area">
          {messages[activeTab].length === 0 ? (
            <div className="empty-state">
              <p className="empty-state-subtitle">Your message will be sent to all models simultaneously.</p>
              {!apiKeys[activeTab] && (
                Object.values(apiKeys).every(v => !v) &&
                <p className="empty-state-warning">⚠️ Start by setting up your API key(s) in settings first</p>
              )}
            </div>
          ) : (
            messages[activeTab].map((msg, idx) => (
              <div key={idx} className={`message-container ${msg.role}`}>
                <div className={`message-bubble ${msg.role} ${msg.role === 'assistant' ? `gradient-${modelConfigs[activeTab].gradient}` : ''}`}>
                  <p><Markdown>{msg.content}</Markdown></p>
                </div>
              </div>
            ))
          )}

          {loading[activeTab] && (
            <div className="message-container assistant">
              <div className="loading-bubble">
                <Loader2 size={20} className="spinner" />
              </div>
            </div>
          )}
        </div>

        {errors[activeTab] && (
          <div className="error-banner">
            <p>{errors[activeTab]}</p>
          </div>
        )}

        <div className="input-container">
          <div className="input-wrapper">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Type your message here..."
              className="message-input"
              disabled={isAnyLoading || !isAnyReady}
            />
            <button
              onClick={handleSubmit}
              disabled={isAnyLoading || !isAnyReady || !prompt.trim()}
              className="submit-button"
            >
              {isAnyLoading ? <Loader2 size={20} className="spinner" /> : <Send size={20} />}
            </button>
          </div>
          <p className="input-hint">Message will be sent to all configured models</p>
        </div>
      </div>

      {showSettings && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>API Settings</h2>
              <button onClick={() => setShowSettings(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {modelNames.map((model) => (
                <div key={model} className="form-group">
                  <label>{modelConfigs[model].apiKeyLabel}
                    <div className="input-group">
                      <input
                        type={showApiKeys[model] ? 'text' : 'password'}
                        value={tempApiKeys[model]}
                        onChange={(e) => setTempApiKeys(prev => ({ ...prev, [model]: e.target.value }))}
                        placeholder={modelConfigs[model].placeholder}
                        className="password-input"
                      />
                      <button
                        onClick={() => setShowApiKeys(prev => ({ ...prev, [model]: !prev[model] }))}
                        className="toggle-button"
                      >
                        {showApiKeys[model] ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </label>
                  <p className="help-text">Get your key from {modelConfigs[model].helpUrl}</p>
                </div>
              ))}

              <div className="button-group">
                <button onClick={saveSettings} className="primary-button">
                  Save Settings
                </button>
                <button onClick={() => setShowSettings(false)} className="secondary-button">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
