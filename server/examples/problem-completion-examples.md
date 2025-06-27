# Problem Completion API Examples

## Overview
The backend now supports tracking problem completion (checkbox) status for users. Here are the key features:

## New Endpoints

### 1. Mark Problem as Completed/Uncompleted
```
POST /api/problems/:problemId/complete
```

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
  "sheetId": "uuid-of-sheet",
  "completed": true  // or false to uncheck
}
```

**Response:**
```json
{
  "message": "Problem marked as completed",
  "progress": {
    "id": "progress-uuid",
    "user_id": "user-uuid",
    "problem_id": "problem-uuid",
    "sheet_id": "sheet-uuid",
    "status": "solved",
    "solved_at": "2025-06-27T10:30:00.000Z",
    "updated_at": "2025-06-27T10:30:00.000Z"
  }
}
```

### 2. Get Problems with Completion Status
All problem endpoints now include completion status when user is authenticated:

```
GET /api/problems?sheet=<sheet-id>
GET /api/problems/search?q=binary
GET /api/problems/:problemId
```

**Headers:**
```
Authorization: Bearer <jwt_token> (optional)
```

**Response includes:**
```json
{
  "problems": [
    {
      "id": "problem-uuid",
      "title": "Two Sum",
      "difficulty": 1,
      "topics": ["Array", "Hash Table"],
      "user_status": "solved",
      "solved_at": "2025-06-27T10:30:00.000Z",
      "isCompleted": true,
      // ... other problem fields
    }
  ]
}
```

### 3. Bulk Update Progress
```
POST /api/progress/bulk
```

**Body:**
```json
{
  "updates": [
    {
      "problemId": "problem-uuid-1",
      "sheetId": "sheet-uuid",
      "status": "solved"
    },
    {
      "problemId": "problem-uuid-2", 
      "sheetId": "sheet-uuid",
      "status": "in_progress"
    }
  ]
}
```

### 4. Get Sheet Completion Statistics
```
GET /api/progress/sheet/:sheetId/stats
```

**Response:**
```json
{
  "totalProblems": 150,
  "completedProblems": 45,
  "bookmarkedProblems": 12,
  "inProgressProblems": 8,
  "completionPercentage": 30.0
}
```

## Frontend Integration Examples

### 1. Checkbox Component
```typescript
const handleProblemToggle = async (problemId: string, sheetId: string, completed: boolean) => {
  try {
    const response = await fetch(`/api/problems/${problemId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sheetId, completed })
    });
    
    if (response.ok) {
      // Update UI to reflect completion
      setProblemCompleted(problemId, completed);
    }
  } catch (error) {
    console.error('Failed to update problem status:', error);
  }
};
```

### 2. Progress Display
```typescript
const fetchSheetProgress = async (sheetId: string) => {
  const response = await fetch(`/api/progress/sheet/${sheetId}/stats`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const stats = await response.json();
  
  // stats.completionPercentage can be used for progress bars
  // stats.completedProblems / stats.totalProblems for counts
};
```

## Database Schema Updates

No schema changes required! The existing `problem_progress` table handles this:

- `status` field: 'solved' = completed checkbox, 'not_started' = unchecked
- `solved_at` field: timestamp when problem was completed
- `updated_at` field: last update time

## Key Benefits

1. **Seamless Integration**: Works with existing progress tracking
2. **Flexible Authentication**: Works for both authenticated and guest users
3. **Real-time Updates**: Immediate reflection of completion status
4. **Progress Analytics**: Built-in statistics for completion tracking
5. **Bulk Operations**: Efficient updates for multiple problems
