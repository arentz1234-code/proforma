'use client';

import { useState } from 'react';
import { Key, Eye, EyeOff, Check, X } from 'lucide-react';

interface ApiKeyInputProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export default function ApiKeyInput({ apiKey, onApiKeyChange }: ApiKeyInputProps) {
  const [showKey, setShowKey] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);

  const handleSave = () => {
    onApiKeyChange(tempKey);
    localStorage.setItem('gemini_api_key', tempKey);
  };

  if (apiKey) {
    return (
      <div className="flex items-center gap-3 p-4 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]">
        <div className="w-8 h-8 rounded-full bg-[var(--accent-success-dim)] flex items-center justify-center">
          <Key size={14} className="text-success" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">API Key Connected</p>
          <p className="text-xs text-[var(--text-muted)]">****{apiKey.slice(-8)}</p>
        </div>
        <button
          onClick={() => { onApiKeyChange(''); localStorage.removeItem('gemini_api_key'); }}
          className="btn btn-ghost btn-sm text-[var(--text-muted)] hover:text-danger"
        >
          <X size={14} /> Remove
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Key size={16} className="text-warning" />
          <span className="card-title">API Key Required</span>
        </div>
      </div>
      <div className="card-body">
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Enter your Google Gemini API key to enable AI-powered document parsing.
          Your key is stored locally and only sent to Google.
        </p>
        <div className="flex gap-3">
          <div className="input-wrapper flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              placeholder="AIza..."
              className="input-field pr-10"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <button onClick={handleSave} disabled={!tempKey} className="btn btn-primary">
            <Check size={16} /> Save Key
          </button>
        </div>
        <p className="text-xs text-[var(--text-dim)] mt-3">
          Get your API key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="text-primary hover:underline">aistudio.google.com/apikey</a>
        </p>
      </div>
    </div>
  );
}
