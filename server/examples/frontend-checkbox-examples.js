// Frontend JavaScript example: How to handle problem checkbox clicks
// This shows the exact code that frontend would use to communicate with backend

// 1. HTML Structure
const htmlExample = `
<div class="problem-item">
  <input 
    type="checkbox" 
    id="problem-123" 
    data-problem-id="123" 
    data-sheet-id="sheet-456"
    onchange="handleProblemToggle(this)"
  />
  <label for="problem-123">Two Sum Problem</label>
  <div class="progress-indicator" id="progress-123"></div>
</div>
`;

// 2. Frontend JavaScript Function
async function handleProblemToggle(checkbox) {
  const problemId = checkbox.dataset.problemId;
  const sheetId = checkbox.dataset.sheetId;
  const isCompleted = checkbox.checked;
  
  console.log(`🔄 Checkbox ${isCompleted ? 'checked' : 'unchecked'} for problem ${problemId}`);
  
  // Show loading state
  checkbox.disabled = true;
  const progressIndicator = document.getElementById(`progress-${problemId}`);
  progressIndicator.textContent = 'Saving...';
  
  try {
    // THIS IS THE BACKEND REQUEST
    const response = await fetch(`/api/problems/${problemId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}` // User's auth token
      },
      body: JSON.stringify({
        sheetId: sheetId,
        completed: isCompleted
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      
      // Update UI based on backend response
      console.log('✅ Backend confirmed:', result.message);
      
      // Update checkbox state (in case backend modified it)
      checkbox.checked = result.isCompleted;
      
      // Update progress indicator
      progressIndicator.textContent = result.isCompleted ? '✓ Completed' : '';
      progressIndicator.className = result.isCompleted ? 'completed' : '';
      
      // Update sheet progress (if you have a progress bar)
      updateSheetProgress(result.sheetProgress);
      
      // Show success feedback
      showNotification(result.message, 'success');
      
    } else {
      // Handle error response
      const error = await response.json();
      console.error('❌ Backend error:', error);
      
      // Revert checkbox state
      checkbox.checked = !isCompleted;
      progressIndicator.textContent = 'Error saving';
      
      showNotification('Failed to update problem status', 'error');
    }
    
  } catch (networkError) {
    console.error('❌ Network error:', networkError);
    
    // Revert checkbox state on network error
    checkbox.checked = !isCompleted;
    progressIndicator.textContent = 'Connection failed';
    
    showNotification('Network error. Please try again.', 'error');
    
  } finally {
    // Re-enable checkbox
    checkbox.disabled = false;
  }
}

// 3. Helper Functions
function updateSheetProgress(sheetProgress) {
  const progressBar = document.getElementById('sheet-progress-bar');
  const progressText = document.getElementById('sheet-progress-text');
  
  if (progressBar) {
    progressBar.style.width = `${sheetProgress.percentage}%`;
  }
  
  if (progressText) {
    progressText.textContent = `${sheetProgress.completed}/${sheetProgress.total} completed`;
  }
}

function showNotification(message, type) {
  // Create/show notification (toast, alert, etc.)
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// 4. React Component Example (if using React)
const ProblemCheckboxReact = ({ problem, onProgressUpdate }) => {
  const [isCompleted, setIsCompleted] = useState(problem.isCompleted);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleToggle = async (event) => {
    const completed = event.target.checked;
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/problems/${problem.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          sheetId: problem.sheetId,
          completed: completed
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setIsCompleted(result.isCompleted);
        onProgressUpdate(result.sheetProgress);
      } else {
        // Revert on error
        setIsCompleted(!completed);
        throw new Error('Failed to update');
      }
      
    } catch (error) {
      console.error('Error updating problem:', error);
      setIsCompleted(!completed); // Revert state
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="problem-item">
      <input
        type="checkbox"
        checked={isCompleted}
        onChange={handleToggle}
        disabled={isLoading}
      />
      <label className={isCompleted ? 'completed' : ''}>
        {problem.title}
      </label>
      {isLoading && <span>Saving...</span>}
    </div>
  );
};

// 5. Vue Component Example (if using Vue)
const ProblemCheckboxVue = {
  props: ['problem'],
  data() {
    return {
      isCompleted: this.problem.isCompleted,
      isLoading: false
    };
  },
  methods: {
    async handleToggle(event) {
      const completed = event.target.checked;
      this.isLoading = true;
      
      try {
        const response = await this.$http.post(`/api/problems/${this.problem.id}/complete`, {
          sheetId: this.problem.sheetId,
          completed: completed
        });
        
        this.isCompleted = response.data.isCompleted;
        this.$emit('progress-updated', response.data.sheetProgress);
        
      } catch (error) {
        console.error('Error updating problem:', error);
        this.isCompleted = !completed; // Revert
      } finally {
        this.isLoading = false;
      }
    }
  },
  template: `
    <div class="problem-item">
      <input
        type="checkbox"
        :checked="isCompleted"
        @change="handleToggle"
        :disabled="isLoading"
      />
      <label :class="{ completed: isCompleted }">
        {{ problem.title }}
      </label>
      <span v-if="isLoading">Saving...</span>
    </div>
  `
};

console.log('📋 Frontend Examples Created');
console.log('✅ These examples show exactly how frontend handles checkbox clicks');
console.log('✅ Each checkbox change triggers a backend API request');
console.log('✅ Backend updates database and returns confirmation');
console.log('✅ Frontend updates UI based on backend response');

export { 
  handleProblemToggle, 
  ProblemCheckboxReact, 
  ProblemCheckboxVue,
  updateSheetProgress,
  showNotification
};
