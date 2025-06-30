import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Upload, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export function InterviewSetup() {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [candidateInfo, setCandidateInfo] = useState({
    name: '',
    email: '',
    phone: '',
    experience: '',
    position: ''
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setResumeFile(file);
      
      // Simple text extraction for demo
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === 'string') {
          setResumeText(text);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleStartInterview = async () => {
    if (!candidateInfo.name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!candidateInfo.email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    setIsCreating(true);
    
    try {
      // Create a session via the backend API
      const response = await fetch('http://localhost:5001/api/sessions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.sessionId) {
        // Store candidate info and resume data in sessionStorage for the interview session
        const resumeData = {
          ...candidateInfo,
          resumeText: resumeText || 'No resume uploaded',
          fileName: resumeFile?.name || null
        };
        
        sessionStorage.setItem('candidateInfo', JSON.stringify(candidateInfo));
        sessionStorage.setItem('resumeData', JSON.stringify(resumeData));
        
        // Navigate to the interview session
        navigate(`/interview/session/${data.sessionId}`);
      } else {
        toast.error('Failed to create interview session');
      }
    } catch (error) {
      console.error('Error creating interview session:', error);
      toast.error('Failed to connect to interview server');
      
      // Fallback to client-side session ID if server is down
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const resumeData = {
        ...candidateInfo,
        resumeText: resumeText || 'No resume uploaded',
        fileName: resumeFile?.name || null
      };
      
      sessionStorage.setItem('candidateInfo', JSON.stringify(candidateInfo));
      sessionStorage.setItem('resumeData', JSON.stringify(resumeData));
      
      navigate(`/interview/session/${sessionId}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="h-full bg-gray-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8 my-4">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <User className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI Technical Interview
          </h1>
          <p className="text-gray-600">
            Welcome to your technical interview session. Please provide your information to get started.
          </p>
        </div>

        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleStartInterview(); }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={candidateInfo.name}
                onChange={(e) => setCandidateInfo(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={candidateInfo.email}
                onChange={(e) => setCandidateInfo(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={candidateInfo.phone}
                onChange={(e) => setCandidateInfo(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Years of Experience
              </label>
              <select
                value={candidateInfo.experience}
                onChange={(e) => setCandidateInfo(prev => ({ ...prev, experience: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select experience</option>
                <option value="0-1">0-1 years</option>
                <option value="1-3">1-3 years</option>
                <option value="3-5">3-5 years</option>
                <option value="5+">5+ years</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Position Applied For
            </label>
            <input
              type="text"
              value={candidateInfo.position}
              onChange={(e) => setCandidateInfo(prev => ({ ...prev, position: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Frontend Developer, Full Stack Engineer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resume Upload (Optional)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                Upload your resume (PDF, DOC, or TXT)
              </p>
              <input
                type="file"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                id="resume-upload"
              />
              <label
                htmlFor="resume-upload"
                className="inline-block px-4 py-2 bg-blue-50 text-blue-600 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
              >
                Choose File
              </label>
              {resumeFile && (
                <p className="mt-2 text-sm text-green-600">
                  ✓ {resumeFile.name} uploaded
                </p>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-blue-900 mb-1">
                  Interview Duration: 20 minutes
                </h3>
                <p className="text-sm text-blue-700">
                  This interview consists of 5 phases: Introduction, Problem Presentation, 
                  Coding, Testing & Evaluation, and Conclusion. Please ensure you have a 
                  stable internet connection.
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isCreating}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isCreating ? 'Creating Session...' : 'Start Interview'}
          </button>
        </form>
      </div>
    </div>
  );
}
