import { InterviewSetup } from '../components/InterviewSetup';

export function Interview() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
        <h1 className="text-2xl font-bold text-white">AI Technical Interview</h1>
        <p className="text-blue-100">
          Fill out the form below to start your interview session
        </p>
      </div>
      
      <InterviewSetup />
    </div>
  );
}
