import { useState } from 'react';
import axios from 'axios';

interface ExecutionResult {
  output: string;
  error: string;
  exitCode: number;
}

export const useCodeExecution = () => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const executeCode = async (code: string, language: string, input: string = '') => {
    setIsExecuting(true);
    setOutput('');
    setError('');

    try {
      // Map language names to Piston API format
      const languageMap: { [key: string]: { language: string; version: string } } = {
        javascript: { language: 'javascript', version: '18.15.0' },
        python: { language: 'python', version: '3.10.0' },
        java: { language: 'java', version: '15.0.2' },
        cpp: { language: 'cpp', version: '10.2.0' },
        c: { language: 'c', version: '10.2.0' },
        go: { language: 'go', version: '1.16.2' },
        rust: { language: 'rust', version: '1.68.2' },
        typescript: { language: 'typescript', version: '5.0.3' },
      };

      const langConfig = languageMap[language] || languageMap.javascript;

      const response = await axios.post('https://emkc.org/api/v2/piston/execute', {
        language: langConfig.language,
        version: langConfig.version,
        files: [
          {
            content: code,
          },
        ],
        stdin: input,
      });

      const result = response.data;

      if (result.run.stderr) {
        setError(result.run.stderr);
      } else {
        setOutput(result.run.stdout || 'No output');
      }
    } catch (err) {
      setError('Failed to execute code. Please try again.');
      console.error('Code execution error:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  return {
    executeCode,
    isExecuting,
    output,
    error,
  };
};