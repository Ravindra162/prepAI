import React, { useState } from 'react';
import { Play, Save, Download, Settings, RefreshCw } from 'lucide-react';
import { CodeEditor } from '../components/CodeEditor';
import { CodeOutput } from '../components/CodeOutput';
import { LanguageSelector } from '../components/LanguageSelector';
import { useCodeExecution } from '../hooks/useCodeExecution';

export const Playground: React.FC = () => {
  const [code, setCode] = useState('// Write your code here\nconsole.log("Hello, World!");');
  const [language, setLanguage] = useState('javascript');
  const [input, setInput] = useState('');
  
  const { executeCode, isExecuting, output, error } = useCodeExecution();

  const handleRunCode = () => {
    executeCode(code, language, input);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Code Playground</h1>
          <p className="text-slate-600 mt-2">Write, run, and test your code in real-time</p>
        </div>
        <div className="flex items-center space-x-4">
          <LanguageSelector value={language} onChange={setLanguage} />
          <button
            onClick={handleRunCode}
            disabled={isExecuting}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isExecuting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>{isExecuting ? 'Running...' : 'Run Code'}</span>
          </button>
        </div>
      </div>

      {/* Code Editor and Output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
        {/* Code Editor */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="border-b border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800">Code Editor</h3>
          </div>
          <CodeEditor
            value={code}
            onChange={setCode}
            language={language}
          />
        </div>

        {/* Input and Output */}
        <div className="space-y-4">
          {/* Input */}
          <div className="bg-white rounded-xl shadow-lg">
            <div className="border-b border-slate-200 p-4">
              <h3 className="font-semibold text-slate-800">Input</h3>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter input for your program..."
              className="w-full h-32 p-4 border-none resize-none focus:outline-none font-mono text-sm"
            />
          </div>

          {/* Output */}
          <div className="bg-white rounded-xl shadow-lg flex-1">
            <div className="border-b border-slate-200 p-4">
              <h3 className="font-semibold text-slate-800">Output</h3>
            </div>
            <CodeOutput output={output} error={error} isExecuting={isExecuting} />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-4">
        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Save className="w-4 h-4" />
          <span>Save Code</span>
        </button>
        <button className="flex items-center space-x-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors">
          <Download className="w-4 h-4" />
          <span>Download</span>
        </button>
        <button className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
};