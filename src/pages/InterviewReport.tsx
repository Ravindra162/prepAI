import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// @ts-ignore - html2pdf.js doesn't have official types
import html2pdf from 'html2pdf.js';

// Enhanced interface for interview data
interface InterviewSummary {
  sessionId: string;
  candidateName?: string;
  duration?: number;
  status: string;
  phase: string;
  problemSolved?: string;
  codeExecutions?: number;
  messagesExchanged?: number;
  candidateProfile?: any;
  finalResults?: any;
  evaluation?: string | { message: string; audio?: any }; // AI-generated evaluation can be string or object
  startTime: string;
  endTime?: string;
}

// Fetch actual interview summary from your backend
async function fetchInterviewSummary(sessionId: string): Promise<InterviewSummary> {
  try {
    // Use environment variable or fallback to localhost
    const baseUrl = import.meta.env.VITE_INTERVIEW_BACKEND_URL
    
    const response = await fetch(`${baseUrl}/api/sessions/${sessionId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching interview summary:', error);
    throw error;
  }
}

export default function InterviewReport() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [summaryData, setSummaryData] = useState<InterviewSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sessionId) {
      setIsLoading(true);
      fetchInterviewSummary(sessionId)
        .then(setSummaryData)
        .catch(() => setError('Failed to load interview summary'))
        .finally(() => setIsLoading(false));
    }
  }, [sessionId]);

  const handleExportPDF = () => {
    if (reportRef.current) {
      html2pdf()
        .set({
          margin: 0.5,
          filename: `Interview_Report_${sessionId}.pdf`,
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
        })
        .from(reportRef.current)
        .save();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading interview report...</p>
        </div>
      </div>
    );
  }

  if (error || !summaryData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-gray-600">{error || 'Report not found'}</p>
          <button
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
            onClick={() => navigate(-1)}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-4 px-2 sm:py-8 sm:px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with actions */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Interview Report</h1>
            <p className="text-gray-600">Session: {sessionId}</p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition-colors"
              onClick={handleExportPDF}
            >
              📄 Export PDF
            </button>
            <button
              className="flex-1 sm:flex-none bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg shadow transition-colors"
              onClick={() => navigate(-1)}
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden" ref={reportRef}>
          {/* Report Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h2 className="text-xl font-bold mb-2">Interview Summary</h2>
                <p className="text-blue-100">Candidate: {summaryData.candidateName || 'N/A'}</p>
                <p className="text-blue-100">Status: {summaryData.status}</p>
                <p className="text-blue-100">Phase: {summaryData.phase}</p>
              </div>
              <div className="text-right">
                <p className="text-blue-100">Date: {new Date(summaryData.startTime).toLocaleDateString()}</p>
                <p className="text-blue-100">Duration: {summaryData.duration} minutes</p>
                {summaryData.endTime && (
                  <p className="text-blue-100">Completed: {new Date(summaryData.endTime).toLocaleTimeString()}</p>
                )}
              </div>
            </div>
          </div>

          {/* Report Body */}
          <div className="p-6 space-y-8">
            {/* Interview Statistics */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Interview Statistics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{summaryData.messagesExchanged || 0}</div>
                  <div className="text-sm text-gray-600">Messages Exchanged</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{summaryData.codeExecutions || 0}</div>
                  <div className="text-sm text-gray-600">Code Executions</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">{summaryData.duration || 0}</div>
                  <div className="text-sm text-gray-600">Minutes</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">{summaryData.problemSolved ? '1' : '0'}</div>
                  <div className="text-sm text-gray-600">Problems</div>
                </div>
              </div>
            </section>

            {/* Problem Information */}
            {summaryData.problemSolved && (
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Problem Tackled</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 font-medium">{summaryData.problemSolved}</p>
                </div>
              </section>
            )}

            {/* Candidate Profile */}
            {summaryData.candidateProfile && (
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Candidate Profile</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-gray-700 text-sm whitespace-pre-wrap">
                    {JSON.stringify(summaryData.candidateProfile, null, 2)}
                  </pre>
                </div>
              </section>
            )}

            {/* Final Results */}
            {summaryData.finalResults && (
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Final Code Results</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-gray-700 text-sm whitespace-pre-wrap">
                    {JSON.stringify(summaryData.finalResults, null, 2)}
                  </pre>
                </div>
              </section>
            )}

            {/* AI Evaluation Summary */}
            {summaryData.evaluation && (
              <section>
                <h3 className="text-lg font-semibold text-purple-700 mb-3">🤖 AI Interview Evaluation</h3>
                <div className="bg-purple-50 border-l-4 border-purple-400 rounded-lg p-6">
                  <div className="prose max-w-none">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {typeof summaryData.evaluation === 'string' 
                        ? summaryData.evaluation 
                        : summaryData.evaluation.message || 'No evaluation available'}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Interview Timeline */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Interview Timeline</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-gray-700">Started: {new Date(summaryData.startTime).toLocaleString()}</span>
                </div>
                {summaryData.endTime && (
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                    <span className="text-gray-700">Ended: {new Date(summaryData.endTime).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                  <span className="text-gray-700">Current Status: <span className="font-semibold capitalize">{summaryData.status}</span></span>
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t">
            <p className="text-sm text-gray-500 text-center">
              Generated on {new Date().toLocaleString()} • Session ID: {sessionId}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
