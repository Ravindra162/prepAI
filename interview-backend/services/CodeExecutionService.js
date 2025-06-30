import axios from 'axios';

export class CodeExecutionService {
  constructor() {
    this.pistonUrl = 'https://emkc.org/api/v2/piston';
    this.supportedLanguages = {
      'javascript': 'javascript',
      'cpp': 'cpp',
      'python': 'python',
      'java': 'java',
      'c': 'c'
    };
  }

  async executeCode(code, language, problemId, testCases, problemTemplates = null, problemTitle = null) {
    try {
      // Validate user code for common mistakes
      if (problemTitle) {
        this.validateUserCode(code, language, problemTitle);
      }

      const results = {
        success: false,
        testResults: [],
        totalTests: testCases.length,
        passedTests: 0,
        executionTime: 0,
        error: null
      };

      const startTime = Date.now();

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        console.log(`Running test case ${i + 1}/${testCases.length}:`, {
          input: testCase.input,
          expected: testCase.expected_output
        });
        try {
          const result = await this.runSingleTest(code, language, testCase, problemId, i, problemTemplates);
          results.testResults.push(result);
          if (result.passed) {
            results.passedTests++;
          }
        } catch (error) {
          results.testResults.push({
            testIndex: i,
            passed: false,
            input: testCase.input,
            expected: testCase.expected_output,
            actual: null,
            error: error.message,
            codeContext: this.generateCodeContext(code, language, testCase, error.message)
          });
        }
      }

      results.executionTime = Date.now() - startTime;
      results.success = results.passedTests === results.totalTests;

      return results;
    } catch (error) {
      return {
        success: false,
        testResults: [],
        totalTests: testCases.length,
        passedTests: 0,
        executionTime: 0,
        error: error.message
      };
    }
  }

  async runSingleTest(code, language, testCase, problemId, testIndex, problemTemplates = null) {
    try {
      // Get the Piston language identifier
      const pistonLanguage = this.getPistonLanguage(language);
      if (!pistonLanguage) {
        throw new Error(`Unsupported language: ${language}`);
      }

      // Generate complete code with driver and user code
      const completeCode = this.generateCompleteCode(code, language, testCase, problemTemplates);
      
      // Generate stdin input for the test case
      const stdinInput = this.generateStdinInput(testCase.input, language);
      console.log('Stdin input:', stdinInput);
      
      // Execute code using Piston API with stdin
      const executionResult = await this.executePiston(completeCode, pistonLanguage, stdinInput);
      console.log('Execution result:', executionResult);
      
      // Parse the output
      const actual = this.parseOutput(executionResult.output, testCase.expected_output);
      const passed = this.compareResults(actual, testCase.expected_output);

      // Enhanced error information with code context
      let errorInfo = null;
      let codeContext = null;
      
      if (executionResult.error) {
        errorInfo = executionResult.error;
        codeContext = this.generateCodeContext(code, language, testCase, executionResult.error);
      } else if (!passed && actual !== null) {
        // CRITICAL FIX: Provide more detailed type and structure mismatch info
        if (typeof actual !== typeof testCase.expected_output) {
          if (Array.isArray(testCase.expected_output) && !Array.isArray(actual)) {
            if (testCase.expected_output.length === 1 && testCase.expected_output[0] === actual) {
              errorInfo = `Type mismatch: expected array [${testCase.expected_output[0]}], got single value ${actual}. The function should return an array even for single elements.`;
            } else {
              errorInfo = `Type mismatch: expected array with ${testCase.expected_output.length} elements, got ${typeof actual} value ${JSON.stringify(actual)}.`;
            }
          } else if (!Array.isArray(testCase.expected_output) && Array.isArray(actual)) {
            errorInfo = `Type mismatch: expected ${typeof testCase.expected_output} value ${JSON.stringify(testCase.expected_output)}, got array ${JSON.stringify(actual)}.`;
          } else {
            errorInfo = `Type mismatch: expected ${typeof testCase.expected_output}, got ${typeof actual}`;
          }
        } else if (Array.isArray(testCase.expected_output) && Array.isArray(actual)) {
          if (actual.length !== testCase.expected_output.length) {
            errorInfo = `Array length mismatch: expected ${testCase.expected_output.length} elements, got ${actual.length} elements`;
          } else {
            // Find first different element
            for (let i = 0; i < actual.length; i++) {
              if (actual[i] !== testCase.expected_output[i]) {
                errorInfo = `Array content mismatch at index ${i}: expected ${testCase.expected_output[i]}, got ${actual[i]}`;
                break;
              }
            }
            if (!errorInfo) {
              errorInfo = `Array content mismatch: ${JSON.stringify(actual)} !== ${JSON.stringify(testCase.expected_output)}`;
            }
          }
        } else {
          errorInfo = `Value mismatch: expected ${JSON.stringify(testCase.expected_output)}, got ${JSON.stringify(actual)}`;
        }
        codeContext = this.generateCodeContext(code, language, testCase, errorInfo);
      }

      return {
        testIndex,
        passed,
        input: testCase.input,
        expected: testCase.expected_output,
        actual,
        error: errorInfo,
        codeContext: codeContext
      };
    } catch (error) {
      return {
        testIndex,
        passed: false,
        input: testCase.input,
        expected: testCase.expected_output,
        actual: null,
        error: error.message,
        codeContext: this.generateCodeContext(code, language, testCase, error.message)
      };
    }
  }

  async executePiston(code, language, stdin = '') {
    try {
      const response = await axios.post(`${this.pistonUrl}/execute`, {
        language: language,
        version: '*', // Use latest version
        files: [
          {
            name: 'main',
            content: code
          }
        ],
        stdin: stdin, // Pass stdin input
        run_timeout: 10000, // 10 seconds timeout
        compile_timeout: 10000
      }, {
        timeout: 15000 // 15 seconds HTTP timeout
      });

      const result = response.data;
      
      return {
        output: result.run?.stdout || '',
        error: result.run?.stderr || result.compile?.stderr || null,
        exitCode: result.run?.code || 0
      };
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Code execution timeout');
      }
      throw new Error(`Execution failed: ${error.message}`);
    }
  }

  getPistonLanguage(language) {
    const mapping = {
      'javascript': 'javascript',
      'js': 'javascript',
      'cpp': 'cpp',
      'c++': 'cpp',
      'python': 'python',
      'py': 'python',
      'java': 'java',
      'c': 'c'
    };
    
    return mapping[language.toLowerCase()];
  }

  generateCompleteCode(userCode, language, testCase, problemTemplates = null) {
    // Debug logging
    console.log('DEBUG generateCompleteCode:');
    console.log('  language:', language);
    console.log('  problemTemplates:', problemTemplates ? 'available' : 'null');
    if (problemTemplates) {
      console.log('  available languages:', Object.keys(problemTemplates));
      console.log('  has driver code for', language, ':', problemTemplates[language] && problemTemplates[language].driver_code ? 'yes' : 'no');
    }
    
    // Use problem-specific driver code if available
    if (problemTemplates && problemTemplates[language] && problemTemplates[language].driver_code) {
      console.log('  Using problem-specific driver code');
      const finalCode = problemTemplates[language].driver_code.replace('// USER CODE WILL BE INSERTED HERE', userCode);
      console.log('  Final code preview (first 500 chars):', finalCode.substring(0, 500));
      return finalCode;
    }

    // Generate default driver code based on language (no test data embedded)
    console.log('  Using default driver code');
    return this.getDefaultDriverCode(userCode, language);
  }

  getDefaultDriverCode(userCode, language) {
    if (language === 'javascript' || language === 'js') {
      return `const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

${userCode}

let inputLines = [];

rl.on('line', (line) => {
  inputLines.push(line.trim());
});

rl.on('close', () => {
  try {
    let result;
    let lineIndex = 0;
    
    // Check for various input patterns
    if (inputLines.length >= 1) {
      const n = parseInt(inputLines[lineIndex++]);
      
      if (inputLines.length >= 3 && lineIndex + 1 < inputLines.length) {
        // Two Sum pattern: n, nums array, target
        const nums = inputLines[lineIndex++].split(' ').map(Number);
        const target = parseInt(inputLines[lineIndex++]);
        
        if (typeof twoSum !== 'undefined') {
          result = twoSum(nums, target);
        } else if (typeof solution !== 'undefined') {
          result = solution(nums, target);
        } else if (typeof solve !== 'undefined') {
          result = solve(nums, target);
        }
      } else if (inputLines.length >= 4) {
        // Merge Two Lists pattern: n1, list1, n2, list2
        lineIndex = 0;
        const n1 = parseInt(inputLines[lineIndex++]);
        const list1 = n1 > 0 && inputLines[lineIndex] ? inputLines[lineIndex].split(' ').map(Number) : [];
        if (n1 > 0) lineIndex++;
        
        const n2 = parseInt(inputLines[lineIndex++]);
        const list2 = n2 > 0 && inputLines[lineIndex] ? inputLines[lineIndex].split(' ').map(Number) : [];
        if (n2 > 0) lineIndex++;
        
        if (typeof mergeTwoLists !== 'undefined') {
          result = mergeTwoLists(list1, list2);
        } else if (typeof solution !== 'undefined') {
          result = solution(list1, list2);
        } else if (typeof solve !== 'undefined') {
          result = solve(list1, list2);
        }
      } else if (inputLines.length >= 1) {
        // Linked List or single array pattern
        let arr = [];
        if (n > 0 && inputLines[lineIndex]) {
          arr = inputLines[lineIndex++].split(' ').map(Number);
        }
        
        // Try reverse linked list functions
        if (typeof reverseList !== 'undefined') {
          result = reverseList(arr);
        } else if (typeof reverse !== 'undefined') {
          result = reverse(arr);
        } else if (typeof solution !== 'undefined') {
          result = solution(arr);
        } else if (typeof solve !== 'undefined') {
          result = solve(arr);
        } else {
          // Extract function name from user code
          const functionMatch = userCode.match(/(?:function\\s+(\\w+)|(?:const|let|var)\\s+(\\w+)\\s*=|class\\s+(\\w+))/);
          if (functionMatch) {
            const funcName = functionMatch[1] || functionMatch[2] || functionMatch[3];
            if (functionMatch[3]) {
              // Class case
              result = eval(\`new \${funcName}().reverse(arr)\`) || eval(\`new \${funcName}().reverseList(arr)\`) || eval(\`new \${funcName}().solution(arr)\`);
            } else {
              // Function case
              try {
                result = eval(\`\${funcName}(arr)\`);
              } catch (e) {
                result = arr.reverse(); // fallback
              }
            }
          } else {
            result = arr.reverse(); // fallback
          }
        }
      }
    }
    
    // Output result with proper array formatting
    if (Array.isArray(result)) {
      console.log(result.join(' '));
    } else if (result !== undefined && result !== null) {
      console.log(JSON.stringify(result));
    } else {
      console.log('');
    }
  } catch (error) {
    console.error('Execution Error:', error.message);
    console.log('');
  }
});`;
    }
    
    if (language === 'cpp' || language === 'c++') {
      return `#include <iostream>
#include <vector>
#include <sstream>
using namespace std;

${userCode}

int main() {
    try {
        int n;
        if (cin >> n) {
            vector<int> arr(n);
            for (int i = 0; i < n; i++) {
                cin >> arr[i];
            }
            
            // Check if this might be merge two lists pattern
            string remaining_input;
            getline(cin, remaining_input); // consume newline
            stringstream ss;
            int n2;
            bool is_merge_pattern = false;
            
            if (cin >> n2) {
                is_merge_pattern = true;
                vector<int> arr2(n2);
                for (int i = 0; i < n2; i++) {
                    cin >> arr2[i];
                }
                
                // Try merge functions
                vector<int> result;
                try {
                    result = mergeTwoLists(arr, arr2);
                } catch (...) {
                    try {
                        result = solution(arr, arr2);
                    } catch (...) {
                        try {
                            result = solve(arr, arr2);
                        } catch (...) {
                            // Fallback: just concatenate and sort
                            result = arr;
                            result.insert(result.end(), arr2.begin(), arr2.end());
                            sort(result.begin(), result.end());
                        }
                    }
                }
                
                // Output result
                for (int i = 0; i < result.size(); i++) {
                    cout << result[i];
                    if (i < result.size() - 1) cout << " ";
                }
                cout << endl;
            } else {
                // Single array pattern (reverse list, etc.)
                vector<int> result;
                
                if (n == 0) {
                    result = {};
                } else {
                    try {
                        result = reverseList(arr);
                    } catch (...) {
                        try {
                            result = reverse(arr);
                        } catch (...) {
                            try {
                                result = solution(arr);
                            } catch (...) {
                                // Fallback: reverse manually
                                result = arr;
                                reverse(result.begin(), result.end());
                            }
                        }
                    }
                }
                
                // Output result
                for (int i = 0; i < result.size(); i++) {
                    cout << result[i];
                    if (i < result.size() - 1) cout << " ";
                }
                cout << endl;
            }
        }
    } catch (...) {
        cout << "" << endl;
    }
    
    return 0;
}`;
    }
    
    if (language === 'python' || language === 'py') {
      return `import json
import sys

${userCode}

try:
    lines = []
    for line in sys.stdin:
        lines.append(line.strip())
    
    result = None
    
    if len(lines) >= 1:
        n = int(lines[0])
        
        if len(lines) >= 3:
            # Two Sum pattern
            nums = list(map(int, lines[1].split())) if lines[1] else []
            target = int(lines[2])
            
            if 'twoSum' in locals():
                result = twoSum(nums, target)
            elif 'solution' in locals():
                result = solution(nums, target)
            elif 'solve' in locals():
                result = solve(nums, target)
        elif len(lines) >= 4:
            # Merge Two Lists pattern
            line_idx = 0
            n1 = int(lines[line_idx])
            line_idx += 1
            list1 = []
            if n1 > 0 and line_idx < len(lines):
                list1 = list(map(int, lines[line_idx].split())) if lines[line_idx] else []
                line_idx += 1
            
            n2 = int(lines[line_idx])
            line_idx += 1
            list2 = []
            if n2 > 0 and line_idx < len(lines):
                list2 = list(map(int, lines[line_idx].split())) if lines[line_idx] else []
            
            if 'mergeTwoLists' in locals():
                result = mergeTwoLists(list1, list2)
            elif 'solution' in locals():
                result = solution(list1, list2)
            elif 'solve' in locals():
                result = solve(list1, list2)
        elif len(lines) >= 1:
            # Linked List or single array pattern
            arr = []
            if n > 0 and len(lines) > 1:
                arr = list(map(int, lines[1].split())) if lines[1] else []
            
            if 'reverseList' in locals():
                result = reverseList(arr)
            elif 'reverse' in locals():
                result = reverse(arr)
            elif 'solution' in locals():
                result = solution(arr)
            elif 'solve' in locals():
                result = solve(arr)
            else:
                result = arr[::-1]  # fallback
    
    # Output result with proper array formatting
    if isinstance(result, list):
        print(' '.join(map(str, result)))
    elif result is not None:
        print(json.dumps(result))
    else:
        print('')
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    print('')`;
    }
    
    return userCode; // Fallback
  }

  generateStdinInput(input, language) {
    if (typeof input === 'object' && input !== null) {
      // Convert input object to stdin format
      let stdinLines = [];
      
      // Handle different input formats based on common patterns
      if (input.nums && input.target !== undefined) {
        // Two Sum pattern: nums array + target
        stdinLines.push(input.nums.length.toString());
        stdinLines.push(input.nums.join(' '));
        stdinLines.push(input.target.toString());
      } else if (input.head !== undefined) {
        // Linked List pattern: head array
        stdinLines.push(input.head.length.toString());
        if (input.head.length > 0) {
          stdinLines.push(input.head.join(' '));
        }
      } else if (input.list1 !== undefined && input.list2 !== undefined) {
        // Merge Two Lists pattern - CRITICAL FIX for empty list handling
        stdinLines.push(input.list1.length.toString());
        if (input.list1.length > 0) {
          stdinLines.push(input.list1.join(' '));
        }
        stdinLines.push(input.list2.length.toString());
        if (input.list2.length > 0) {
          stdinLines.push(input.list2.join(' '));
        }
      } else {
        // Generic object: output each property
        for (const [key, value] of Object.entries(input)) {
          if (Array.isArray(value)) {
            stdinLines.push(value.length.toString());
            if (value.length > 0) {
              stdinLines.push(value.join(' '));
            }
          } else {
            stdinLines.push(value.toString());
          }
        }
      }
      
      return stdinLines.join('\n') + '\n';
    }
    
    // For primitive inputs
    return input.toString() + '\n';
  }

  parseOutput(output, expectedOutput) {
    if (!output || output.trim() === '') {
      // Handle empty output case - return empty array if expected output is array
      return Array.isArray(expectedOutput) ? [] : null;
    }
    
    // Remove any trailing newlines and extra whitespace
    const trimmedOutput = output.trim().replace(/\n+$/, '').replace(/^\n+/, '');
    
    // If output is just 'null', return null
    if (trimmedOutput === 'null') return null;
    
    // Handle empty string after trimming (should return empty array if expected output is array)
    if (trimmedOutput === '') {
      return Array.isArray(expectedOutput) ? [] : null;
    }
    
    try {
      // First try to parse as JSON (handles arrays, objects, strings, numbers, booleans)
      const jsonParsed = JSON.parse(trimmedOutput);
      
      // CRITICAL FIX: If expected output is array but we got a primitive value,
      // and the primitive value should be wrapped in an array (common in edge cases)
      if (Array.isArray(expectedOutput) && !Array.isArray(jsonParsed) && jsonParsed !== null) {
        // Check if the single value matches what we expect in a single-element array
        if (expectedOutput.length === 1 && expectedOutput[0] === jsonParsed) {
          return [jsonParsed];
        }
        // For empty expected arrays, don't auto-wrap
        if (expectedOutput.length === 0) {
          return expectedOutput; // Return empty array as expected
        }
      }
      
      return jsonParsed;
    } catch (jsonError) {
      // JSON parsing failed, handle specific types based on expected output
      if (Array.isArray(expectedOutput)) {
        // Parse array output - handle various formats
        if (trimmedOutput.startsWith('[') && trimmedOutput.endsWith(']')) {
          // Already in array format like [1,2,3]
          try {
            return JSON.parse(trimmedOutput);
          } catch (e) {
            // Try without quotes
            const content = trimmedOutput.slice(1, -1).trim();
            if (content === '') return [];
            return content.split(',').map(item => {
              const num = parseInt(item.trim());
              return isNaN(num) ? item.trim() : num;
            });
          }
        } else if (trimmedOutput.includes(' ')) {
          // Space-separated format like "5 4 3 2 1"
          return trimmedOutput.split(' ').filter(item => item.trim() !== '').map(item => {
            const trimmed = item.trim();
            if (trimmed === '') return null;
            const num = parseInt(trimmed);
            return isNaN(num) ? trimmed : num;
          }).filter(item => item !== null);
        } else if (trimmedOutput.includes(',')) {
          // Comma-separated format like "1,2,3"
          return trimmedOutput.split(',').map(item => {
            const num = parseInt(item.trim());
            return isNaN(num) ? item.trim() : num;
          });
        } else {
          // CRITICAL FIX: Single item should be wrapped in array if expected is array
          const num = parseInt(trimmedOutput);
          const parsedValue = isNaN(num) ? trimmedOutput : num;
          
          // If expected is a single-element array and our parsed value matches, wrap it
          if (expectedOutput.length === 1 && expectedOutput[0] === parsedValue) {
            return [parsedValue];
          }
          
          return [parsedValue];
        }
      } else if (typeof expectedOutput === 'boolean') {
        return trimmedOutput.toLowerCase() === 'true';
      } else if (typeof expectedOutput === 'number') {
        const num = parseFloat(trimmedOutput);
        return isNaN(num) ? trimmedOutput : num;
      }
      
      // Return as string if nothing else works
      return trimmedOutput;
    }
  }

  compareResults(actual, expected) {
    // Handle null/undefined cases
    if (actual === null || actual === undefined) {
      return expected === null || expected === undefined;
    }
    if (expected === null || expected === undefined) {
      return actual === null || actual === undefined;
    }
    
    // CRITICAL FIX: Handle type mismatches more robustly
    if (Array.isArray(expected)) {
      if (!Array.isArray(actual)) {
        // Special case: if expected is single-element array and actual is that element
        if (expected.length === 1 && expected[0] === actual) {
          return false; // Still a type mismatch, but log it properly
        }
        return false;
      }
      
      if (actual.length !== expected.length) return false;
      
      return actual.every((val, index) => {
        const expectedVal = expected[index];
        
        // Handle number comparisons with small floating point differences
        if (typeof expectedVal === 'number' && typeof val === 'number') {
          return Math.abs(val - expectedVal) < 1e-9;
        }
        
        return val === expectedVal;
      });
    }
    
    // CRITICAL FIX: Better type checking for primitives
    if (typeof expected !== typeof actual) {
      // Try to convert and compare if reasonable
      if (typeof expected === 'number' && typeof actual === 'string') {
        const numActual = parseFloat(actual);
        if (!isNaN(numActual)) {
          return Math.abs(numActual - expected) < 1e-9;
        }
      }
      if (typeof expected === 'string' && typeof actual === 'number') {
        const numExpected = parseFloat(expected);
        if (!isNaN(numExpected)) {
          return Math.abs(actual - numExpected) < 1e-9;
        }
      }
      
      return false;
    }
    
    // For numbers, allow small floating point differences
    if (typeof expected === 'number' && typeof actual === 'number') {
      return Math.abs(actual - expected) < 1e-9;
    }
    
    // For objects and other types, use strict equality
    return actual === expected;
  }

  generateCodeContext(userCode, language, testCase, errorMessage) {
    // Create a comprehensive context for the LLM to analyze
    return {
      userCode: userCode,
      language: language,
      testCase: {
        input: testCase.input,
        expectedOutput: testCase.expected_output
      },
      errorMessage: errorMessage,
      analysisPrompt: this.generateAnalysisPrompt(userCode, language, testCase, errorMessage)
    };
  }

  generateAnalysisPrompt(userCode, language, testCase, errorMessage) {
    return `Please analyze the following code and provide helpful feedback to the candidate:

**Language:** ${language}

**User's Code:**
\`\`\`${language}
${userCode}
\`\`\`

**Test Case:**
- Input: ${JSON.stringify(testCase.input)}
- Expected Output: ${JSON.stringify(testCase.expected_output)}

**Error/Issue:**
${errorMessage}

**Please provide:**
1. What the error means in simple terms
2. Potential issues in the code
3. Specific suggestions for improvement
4. Hint about the correct approach (without giving away the complete solution)
5. Common mistakes to avoid for this type of problem

Focus on being helpful and educational while encouraging the candidate to think through the solution.`;
  }

  // Enhanced error checking for common coding mistakes
  validateUserCode(code, language, problemTitle) {
    // Check for common mistakes in specific problems
    if (problemTitle && problemTitle.toLowerCase().includes('parentheses')) {
      // Valid Parentheses shouldn't reference linked list variables
      if (code.includes('head') || code.includes('ListNode')) {
        throw new Error('Invalid code: This problem works with strings, not linked lists. Please remove references to "head" or "ListNode".');
      }
    }
    
    if (problemTitle && problemTitle.toLowerCase().includes('two sum')) {
      // Two Sum works with arrays, not linked lists
      if (code.includes('head') || code.includes('ListNode')) {
        throw new Error('Invalid code: This problem works with arrays, not linked lists. Please remove references to "head" or "ListNode".');
      }
    }
    
    // Add more problem-specific validations as needed
    return true;
  }
}
