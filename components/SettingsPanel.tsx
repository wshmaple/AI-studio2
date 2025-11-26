
import React from 'react';
import { Settings } from '../types';
import { AVAILABLE_MODELS } from '../constants';
import { X, Settings2, Link } from 'lucide-react';

interface SettingsPanelProps {
  settings: Settings;
  onUpdate: (s: Settings) => void;
  isOpen: boolean;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onUpdate, isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleChange = (key: keyof Settings, value: any) => {
    onUpdate({ ...settings, [key]: value });
  };

  const selectedModelDef = AVAILABLE_MODELS.find(m => m.value === settings.model);
  const isOllama = selectedModelDef?.provider === 'ollama';

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-[#1e1e1e] border-l border-[#333] shadow-2xl z-50 p-4 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Settings2 size={18} /> Run Settings
        </h2>
        <button onClick={onClose} className="p-1 hover:bg-[#333] rounded">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-400">Model</label>
          <select 
            value={settings.model}
            onChange={(e) => handleChange('model', e.target.value)}
            className="w-full bg-[#2a2a2a] border border-[#444] rounded p-2 text-sm focus:border-blue-500 outline-none"
          >
            <optgroup label="Google Gemini">
                {AVAILABLE_MODELS.filter(m => m.provider === 'google').map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                ))}
            </optgroup>
            <optgroup label="Ollama (Local)">
                {AVAILABLE_MODELS.filter(m => m.provider === 'ollama').map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                ))}
            </optgroup>
          </select>
        </div>
        
        {isOllama && (
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-400 flex items-center gap-1">
                 <Link size={14} /> Ollama URL
              </label>
              <input 
                type="text"
                value={settings.ollamaUrl}
                onChange={(e) => handleChange('ollamaUrl', e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full bg-[#2a2a2a] border border-[#444] rounded p-2 text-sm focus:border-blue-500 outline-none"
              />
              <p className="text-[10px] text-gray-500 mt-1">Ensure Ollama is running with `OLLAMA_ORIGINS="*"` to allow browser access.</p>
            </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-400">System Instructions</label>
          <textarea 
            value={settings.systemInstruction}
            onChange={(e) => handleChange('systemInstruction', e.target.value)}
            className="w-full bg-[#2a2a2a] border border-[#444] rounded p-2 text-sm h-32 focus:border-blue-500 outline-none resize-none"
            placeholder="Enter system instructions..."
          />
        </div>

        <div>
          <div className="flex justify-between mb-2">
             <label className="text-sm font-medium text-gray-400">Temperature</label>
             <span className="text-xs text-gray-500">{settings.temperature}</span>
          </div>
          <input 
            type="range" min="0" max="2" step="0.1"
            value={settings.temperature}
            onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>

        <div>
           <div className="flex justify-between mb-2">
             <label className="text-sm font-medium text-gray-400">Top P</label>
             <span className="text-xs text-gray-500">{settings.topP}</span>
          </div>
          <input 
            type="range" min="0" max="1" step="0.01"
            value={settings.topP}
            onChange={(e) => handleChange('topP', parseFloat(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>

        <div>
           <div className="flex justify-between mb-2">
             <label className="text-sm font-medium text-gray-400">Top K</label>
             <span className="text-xs text-gray-500">{settings.topK}</span>
          </div>
          <input 
            type="range" min="1" max="100" step="1"
            value={settings.topK}
            onChange={(e) => handleChange('topK', parseInt(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>

        <div className={`flex items-center justify-between ${isOllama ? 'opacity-50 pointer-events-none' : ''}`}>
          <label className="text-sm font-medium text-gray-400">Google Search</label>
          <div 
            onClick={() => !isOllama && handleChange('enableSearch', !settings.enableSearch)}
            className={`w-10 h-5 rounded-full cursor-pointer relative transition-colors ${settings.enableSearch ? 'bg-blue-600' : 'bg-[#444]'}`}
          >
            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.enableSearch ? 'left-6' : 'left-1'}`} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;