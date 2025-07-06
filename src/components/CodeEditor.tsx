import React, { memo, useCallback } from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = memo(({ value, onChange, language }) => {
  const handleEditorChange = useCallback((newValue: string | undefined) => {
    onChange(newValue || '');
  }, [onChange]);

  return (
    <div className="h-full border rounded-lg overflow-hidden">
      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={handleEditorChange}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          readOnly: false,
          automaticLayout: true,
          wordWrap: 'on',
          tabSize: 2,
          insertSpaces: true,
          formatOnPaste: true,
          formatOnType: true,
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: 'on',
          snippetSuggestions: 'inline',
        }}
        loading={
          <div className="flex items-center justify-center h-full">
            <div className="text-slate-500">Loading editor...</div>
          </div>
        }
      />
    </div>
  );
});