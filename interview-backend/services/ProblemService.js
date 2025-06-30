export class ProblemService {
  constructor() {
    this.problems = this.initializeProblems();
  }

  initializeProblems() {
    return [
      {
        question_id: 1,
        title: "Two Sum",
        description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
        difficulty: "Easy",
        category: "Array",
        constraints: "2 <= nums.length <= 10^4, -10^9 <= nums[i] <= 10^9, -10^9 <= target <= 10^9, Only one valid answer exists.",
        test_cases: [
          { input: { nums: [2, 7, 11, 15], target: 9 }, expected_output: [0, 1] },
          { input: { nums: [3, 2, 4], target: 6 }, expected_output: [1, 2] },
          { input: { nums: [3, 3], target: 6 }, expected_output: [0, 1] },
          { input: { nums: [1, 2, 3, 4, 5], target: 9 }, expected_output: [3, 4] },
          { input: { nums: [-1, -2, -3, -4, -5], target: -8 }, expected_output: [2, 4] },
          { input: { nums: [0, 4, 3, 0], target: 0 }, expected_output: [0, 3] }
        ],
        templates: {
          cpp: {
            template: "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write your solution here\n        return {};\n    }\n};",
            driver_code: "#include <iostream>\n#include <vector>\nusing namespace std;\n\n// USER CODE WILL BE INSERTED HERE\n\nint main() {\n    Solution solution;\n    \n    int n;\n    cin >> n;\n    \n    vector<int> nums(n);\n    for (int i = 0; i < n; i++) {\n        cin >> nums[i];\n    }\n    \n    int target;\n    cin >> target;\n    \n    vector<int> result = solution.twoSum(nums, target);\n    \n    for (int i = 0; i < result.size(); i++) {\n        cout << result[i];\n        if (i < result.size() - 1) cout << \" \";\n    }\n    cout << endl;\n    \n    return 0;\n}"
          },
          javascript: {
            template: "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nvar twoSum = function(nums, target) {\n    // Write your solution here\n};",
            driver_code: "const readline = require('readline');\nconst rl = readline.createInterface({\n    input: process.stdin,\n    output: process.stdout\n});\n\n// USER CODE WILL BE INSERTED HERE\n\nlet inputLines = [];\nlet currentLine = 0;\n\nrl.on('line', (line) => {\n    inputLines.push(line.trim());\n});\n\nrl.on('close', () => {\n    const n = parseInt(inputLines[currentLine++]);\n    const nums = inputLines[currentLine++].split(' ').map(Number);\n    const target = parseInt(inputLines[currentLine++]);\n    \n    const result = twoSum(nums, target);\n    \n    console.log(result.join(' '));\n});"
          }
        }
      },
      {
        question_id: 2,
        title: "Reverse Linked List",
        description: "Given the head of a singly linked list, reverse the list, and return the reversed list.",
        difficulty: "Easy",
        category: "Linked List",
        constraints: "The number of nodes in the list is the range [0, 5000]. -5000 <= Node.val <= 5000",
        test_cases: [
          { input: { head: [1, 2, 3, 4, 5] }, expected_output: [5, 4, 3, 2, 1] },
          { input: { head: [1, 2] }, expected_output: [2, 1] },
          { input: { head: [] }, expected_output: [] },
          { input: { head: [1] }, expected_output: [1] },
          { input: { head: [1, 2, 3] }, expected_output: [3, 2, 1] },
          { input: { head: [0] }, expected_output: [0] },
          { input: { head: [-1, -2, -3] }, expected_output: [-3, -2, -1] }
        ],
        templates: {
          cpp: {
            template: "struct ListNode {\n    int val;\n    ListNode *next;\n    ListNode() : val(0), next(nullptr) {}\n    ListNode(int x) : val(x), next(nullptr) {}\n    ListNode(int x, ListNode *next) : val(x), next(next) {}\n};\n\nclass Solution {\npublic:\n    ListNode* reverseList(ListNode* head) {\n        // Write your solution here\n        return nullptr;\n    }\n};",
            driver_code: "#include <iostream>\n#include <vector>\nusing namespace std;\n\n// USER CODE WILL BE INSERTED HERE\n\nListNode* createList(vector<int>& nums) {\n    if (nums.empty()) return nullptr;\n    ListNode* head = new ListNode(nums[0]);\n    ListNode* current = head;\n    for (int i = 1; i < nums.size(); i++) {\n        current->next = new ListNode(nums[i]);\n        current = current->next;\n    }\n    return head;\n}\n\nvoid printList(ListNode* head) {\n    while (head) {\n        cout << head->val;\n        if (head->next) cout << \" \";\n        head = head->next;\n    }\n    cout << endl;\n}\n\nint main() {\n    int n;\n    cin >> n;\n    \n    vector<int> nums(n);\n    for (int i = 0; i < n; i++) {\n        cin >> nums[i];\n    }\n    \n    ListNode* head = createList(nums);\n    Solution solution;\n    ListNode* result = solution.reverseList(head);\n    printList(result);\n    \n    return 0;\n}"
          },
          javascript: {
            template: "function ListNode(val, next) {\n    this.val = (val===undefined ? 0 : val)\n    this.next = (next===undefined ? null : next)\n}\n\n/**\n * @param {ListNode} head\n * @return {ListNode}\n */\nvar reverseList = function(head) {\n    // Write your solution here\n};",
            driver_code: "const readline = require('readline');\nconst rl = readline.createInterface({\n    input: process.stdin,\n    output: process.stdout\n});\n\n// USER CODE WILL BE INSERTED HERE\n\nfunction createList(nums) {\n    if (nums.length === 0) return null;\n    let head = new ListNode(nums[0]);\n    let current = head;\n    for (let i = 1; i < nums.length; i++) {\n        current.next = new ListNode(nums[i]);\n        current = current.next;\n    }\n    return head;\n}\n\nfunction listToArray(head) {\n    const result = [];\n    while (head) {\n        result.push(head.val);\n        head = head.next;\n    }\n    return result;\n}\n\nlet inputLines = [];\nlet currentLine = 0;\n\nrl.on('line', (line) => {\n    inputLines.push(line.trim());\n});\n\nrl.on('close', () => {\n    const n = parseInt(inputLines[currentLine++]);\n    const nums = n > 0 ? inputLines[currentLine++].split(' ').map(Number) : [];\n    \n    const head = createList(nums);\n    const result = reverseList(head);\n    const output = listToArray(result);\n    \n    console.log(output.join(' '));\n});"
          }
        }
      },
      {
        question_id: 3,
        title: "Valid Parentheses",
        description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. An input string is valid if: Open brackets must be closed by the same type of brackets. Open brackets must be closed in the correct order.",
        difficulty: "Easy",
        category: "Stack",
        constraints: "1 <= s.length <= 10^4, s consists of parentheses only '()[]{}'.",
        test_cases: [
          { input: { s: "()" }, expected_output: true },
          { input: { s: "()[]{}" }, expected_output: true },
          { input: { s: "(]" }, expected_output: false },
          { input: { s: "([)]" }, expected_output: false },
          { input: { s: "{[]}" }, expected_output: true },
          { input: { s: "" }, expected_output: true },
          { input: { s: "(((" }, expected_output: false }
        ],
        templates: {
          cpp: {
            template: "class Solution {\npublic:\n    bool isValid(string s) {\n        // Write your solution here\n        return false;\n    }\n};",
            driver_code: "#include <iostream>\n#include <string>\nusing namespace std;\n\n// USER CODE WILL BE INSERTED HERE\n\nint main() {\n    string s;\n    cin >> s;\n    \n    Solution solution;\n    bool result = solution.isValid(s);\n    \n    cout << (result ? \"true\" : \"false\") << endl;\n    \n    return 0;\n}"
          },
          javascript: {
            template: "/**\n * @param {string} s\n * @return {boolean}\n */\nvar isValid = function(s) {\n    // Write your solution here\n};",
            driver_code: "const readline = require('readline');\nconst rl = readline.createInterface({\n    input: process.stdin,\n    output: process.stdout\n});\n\n// USER CODE WILL BE INSERTED HERE\n\nlet inputLines = [];\nlet currentLine = 0;\n\nrl.on('line', (line) => {\n    inputLines.push(line.trim());\n});\n\nrl.on('close', () => {\n    const s = inputLines[currentLine++];\n    \n    const result = isValid(s);\n    \n    console.log(result);\n});"
          }
        }
      },
      {
        question_id: 4,
        title: "Maximum Subarray",
        description: "Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.",
        difficulty: "Medium",
        category: "Dynamic Programming",
        constraints: "1 <= nums.length <= 10^5, -10^4 <= nums[i] <= 10^4",
        test_cases: [
          { input: { nums: [-2, 1, -3, 4, -1, 2, 1, -5, 4] }, expected_output: 6 },
          { input: { nums: [1] }, expected_output: 1 },
          { input: { nums: [5, 4, -1, 7, 8] }, expected_output: 23 },
          { input: { nums: [-1] }, expected_output: -1 },
          { input: { nums: [-2, -1] }, expected_output: -1 },
          { input: { nums: [0] }, expected_output: 0 },
          { input: { nums: [-5, -2, -8, -1] }, expected_output: -1 }
        ],
        templates: {
          cpp: {
            template: "class Solution {\npublic:\n    int maxSubArray(vector<int>& nums) {\n        // Write your solution here\n        return 0;\n    }\n};",
            driver_code: "#include <iostream>\n#include <vector>\nusing namespace std;\n\n// USER CODE WILL BE INSERTED HERE\n\nint main() {\n    int n;\n    cin >> n;\n    \n    vector<int> nums(n);\n    for (int i = 0; i < n; i++) {\n        cin >> nums[i];\n    }\n    \n    Solution solution;\n    int result = solution.maxSubArray(nums);\n    \n    cout << result << endl;\n    \n    return 0;\n}"
          },
          javascript: {
            template: "/**\n * @param {number[]} nums\n * @return {number}\n */\nvar maxSubArray = function(nums) {\n    // Write your solution here\n};",
            driver_code: "const readline = require('readline');\nconst rl = readline.createInterface({\n    input: process.stdin,\n    output: process.stdout\n});\n\n// USER CODE WILL BE INSERTED HERE\n\nlet inputLines = [];\nlet currentLine = 0;\n\nrl.on('line', (line) => {\n    inputLines.push(line.trim());\n});\n\nrl.on('close', () => {\n    const n = parseInt(inputLines[currentLine++]);\n    const nums = inputLines[currentLine++].split(' ').map(Number);\n    \n    const result = maxSubArray(nums);\n    \n    console.log(result);\n});"
          }
        }
      },
      {
        question_id: 5,
        title: "Merge Two Sorted Lists",
        description: "You are given the heads of two sorted linked lists list1 and list2. Merge the two lists in a one sorted list. The list should be made by splicing together the nodes of the first two lists.",
        difficulty: "Easy",
        category: "Linked List",
        constraints: "The number of nodes in both lists is in the range [0, 50]. -100 <= Node.val <= 100. Both list1 and list2 are sorted in non-decreasing order.",
        test_cases: [
          { input: { list1: [1, 2, 4], list2: [1, 3, 4] }, expected_output: [1, 1, 2, 3, 4, 4] },
          { input: { list1: [], list2: [] }, expected_output: [] },
          { input: { list1: [], list2: [0] }, expected_output: [0] },
          { input: { list1: [1, 2, 3], list2: [4, 5, 6] }, expected_output: [1, 2, 3, 4, 5, 6] },
          { input: { list1: [5], list2: [1, 2, 4] }, expected_output: [1, 2, 4, 5] },
          { input: { list1: [1], list2: [] }, expected_output: [1] },
          { input: { list1: [-1, 0, 1], list2: [-2, 2] }, expected_output: [-2, -1, 0, 1, 2] }
        ],
        templates: {
          cpp: {
            template: "struct ListNode {\n    int val;\n    ListNode *next;\n    ListNode() : val(0), next(nullptr) {}\n    ListNode(int x) : val(x), next(nullptr) {}\n    ListNode(int x, ListNode *next) : val(x), next(next) {}\n};\n\nclass Solution {\npublic:\n    ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {\n        // Write your solution here\n        return nullptr;\n    }\n};",
            driver_code: "#include <iostream>\n#include <vector>\nusing namespace std;\n\n// USER CODE WILL BE INSERTED HERE\n\nListNode* createList(vector<int>& nums) {\n    if (nums.empty()) return nullptr;\n    ListNode* head = new ListNode(nums[0]);\n    ListNode* current = head;\n    for (int i = 1; i < nums.size(); i++) {\n        current->next = new ListNode(nums[i]);\n        current = current->next;\n    }\n    return head;\n}\n\nvoid printList(ListNode* head) {\n    while (head) {\n        cout << head->val;\n        if (head->next) cout << \" \";\n        head = head->next;\n    }\n    cout << endl;\n}\n\nint main() {\n    int n1, n2;\n    cin >> n1;\n    \n    vector<int> nums1(n1);\n    for (int i = 0; i < n1; i++) {\n        cin >> nums1[i];\n    }\n    \n    cin >> n2;\n    vector<int> nums2(n2);\n    for (int i = 0; i < n2; i++) {\n        cin >> nums2[i];\n    }\n    \n    ListNode* list1 = createList(nums1);\n    ListNode* list2 = createList(nums2);\n    \n    Solution solution;\n    ListNode* result = solution.mergeTwoLists(list1, list2);\n    printList(result);\n    \n    return 0;\n}"
          },
          javascript: {
            template: "function ListNode(val, next) {\n    this.val = (val===undefined ? 0 : val)\n    this.next = (next===undefined ? null : next)\n}\n\n/**\n * @param {ListNode} list1\n * @param {ListNode} list2\n * @return {ListNode}\n */\nvar mergeTwoLists = function(list1, list2) {\n    // Write your solution here\n};",
            driver_code: "const readline = require('readline');\nconst rl = readline.createInterface({\n    input: process.stdin,\n    output: process.stdout\n});\n\n// ListNode definition\nfunction ListNode(val, next) {\n    this.val = (val===undefined ? 0 : val)\n    this.next = (next===undefined ? null : next)\n}\n\n// USER CODE WILL BE INSERTED HERE\n\nfunction createList(nums) {\n    if (nums.length === 0) return null;\n    let head = new ListNode(nums[0]);\n    let current = head;\n    for (let i = 1; i < nums.length; i++) {\n        current.next = new ListNode(nums[i]);\n        current = current.next;\n    }\n    return head;\n}\n\nfunction listToArray(head) {\n    const result = [];\n    while (head) {\n        result.push(head.val);\n        head = head.next;\n    }\n    return result;\n}\n\nlet inputLines = [];\nlet currentLine = 0;\n\nrl.on('line', (line) => {\n    inputLines.push(line.trim());\n});\n\nrl.on('close', () => {\n    const n1 = parseInt(inputLines[currentLine++]);\n    const nums1 = n1 > 0 ? inputLines[currentLine++].split(' ').map(Number) : [];\n    \n    const n2 = parseInt(inputLines[currentLine++]);\n    const nums2 = n2 > 0 ? inputLines[currentLine++].split(' ').map(Number) : [];\n    \n    const list1 = createList(nums1);\n    const list2 = createList(nums2);\n    \n    const result = mergeTwoLists(list1, list2);\n    const output = listToArray(result);\n    \n    console.log(output.join(' '));\n});"
          }
        }
      }
    ];
  }

  async getRandomProblem(difficulty = null, category = null) {
    let filteredProblems = [...this.problems];

    if (difficulty) {
      filteredProblems = filteredProblems.filter(
        p => p.difficulty.toLowerCase() === difficulty.toLowerCase()
      );
    }

    if (category) {
      filteredProblems = filteredProblems.filter(
        p => p.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (filteredProblems.length === 0) {
      filteredProblems = this.problems;
    }

    const randomIndex = Math.floor(Math.random() * filteredProblems.length);
    return filteredProblems[randomIndex];
  }

  getProblemByDifficulty(difficulty) {
    const filtered = this.problems.filter(
      p => p.difficulty.toLowerCase() === difficulty.toLowerCase()
    );
    if (filtered.length === 0) return this.problems[0]; // fallback
    return filtered[Math.floor(Math.random() * filtered.length)];
  }

  async getProblemById(id) {
    return this.problems.find(p => p.question_id === id);
  }

  async getAllProblems() {
    return this.problems;
  }

  async getProblemsByDifficulty(difficulty) {
    return this.problems.filter(
      p => p.difficulty.toLowerCase() === difficulty.toLowerCase()
    );
  }

  async getProblemsByCategory(category) {
    return this.problems.filter(
      p => p.category.toLowerCase() === category.toLowerCase()
    );
  }

  getAvailableCategories() {
    return [...new Set(this.problems.map(p => p.category))];
  }

  getAvailableDifficulties() {
    return [...new Set(this.problems.map(p => p.difficulty))];
  }
}
