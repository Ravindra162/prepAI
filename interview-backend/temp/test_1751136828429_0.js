const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * @param {string} s
 * @return {boolean}
 */
var isValid = function (s) {
    const stack = [];
    const map = {
        ')': '(',
        ']': '[',
        '}': '{'
    };

    for (let char of s) {
        if (char === '(' || char === '[' || char === '{') {
            stack.push(char); // Push opening bracket
        } else {
            // If stack is empty or doesn't match expected opening, invalid
            if (stack.pop() !== map[char]) {
                return false;
            }
        }
    }

    // If stack is empty, all brackets matched correctly
    return stack.length === 0;
};


let inputLines = [];
let currentLine = 0;

rl.on('line', (line) => {
    inputLines.push(line.trim());
});

rl.on('close', () => {
    const n = parseInt(inputLines[currentLine++]);
    const nums = inputLines[currentLine++].split(' ').map(Number);
    const target = parseInt(inputLines[currentLine++]);
    
    const result = twoSum(nums, target);
    
    console.log(result.join(' '));
});