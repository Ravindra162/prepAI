import React from 'react';
import { Terminal, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface CodeOutputProps {
  output: string;
  error: string;
  isExecuting: boolean;
}

export const CodeOutput: React.FC<CodeOutputProps> = ({ output, error, isExecuting }) => {
  if (isExecuting) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center space-x-2 text-blue-600">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Executing code...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full p-4">
        <div className="flex items-center space-x-2 text-red-600 mb-2">
          <AlertCircle className="w-4 h-4" />
          <span className="font-medium">Error</span>
        </div>
        <pre className="text-sm text-red-700 bg-red-50 p-3 rounded-lg overflow-auto">
          {error}
        </pre>
      </div>
    );
  }

  if (output) {
    return (
      <div className="h-full p-4">
        <div className="flex items-center space-x-2 text-green-600 mb-2">
          <CheckCircle className="w-4 h-4" />
          <span className="font-medium">Output</span>
        </div>
        <pre className="text-sm text-slate-800 bg-slate-50 p-3 rounded-lg overflow-auto">
          {output}
        </pre>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center">
      <div className="flex items-center space-x-2 text-slate-400">
        <Terminal className="w-5 h-5" />
        <span>Run your code to see output</span>
      </div>
    </div>
  );
};