import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  FileDown, 
  CheckCircle, 
  Clock, 
  Code, 
  MessageSquare,
  TrendingUp,
  Target,
  BookOpen,
  Award,
  Printer,
  FileText,
  Download,
  Share2,
  Calendar,
  User,
  Mail,
  ChevronDown
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

interface InterviewEvaluationProps {
  evaluation: string;
  candidateInfo: {
    name: string;
    email: string;
    experience?: string;
    skills?: string[];
  };
  sessionSummary?: {
    duration: number;
    problemsSolved: number;
    codeExecutions: number;
    hintsUsed: number;
    testsPassed: number;
    totalTests: number;
  };
  onStartNewInterview?: () => void;
  onBackToHome?: () => void;
}

export function InterviewEvaluation({ 
  evaluation, 
  candidateInfo, 
  sessionSummary,
  onStartNewInterview,
  onBackToHome 
}: InterviewEvaluationProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const evaluationRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowExportOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getSuccessRate = () => {
    if (!sessionSummary || sessionSummary.totalTests === 0) return 0;
    return Math.round((sessionSummary.testsPassed / sessionSummary.totalTests) * 100);
  };

  const getPerformanceColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const exportToPDF = async () => {
    if (!evaluationRef.current) return;
    
    setIsExporting(true);
    try {
      const element = evaluationRef.current;
      
      // Create a clone for better PDF rendering
      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.width = '210mm'; // A4 width
      clone.style.background = 'white';
      clone.style.padding = '20mm';
      clone.style.fontFamily = 'Arial, sans-serif';
      clone.style.fontSize = '12px';
      clone.style.lineHeight = '1.5';
      
      document.body.appendChild(clone);
      
      const canvas = await html2canvas(clone, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: 794, // A4 width in pixels at 96 DPI
        allowTaint: false,
        logging: false
      });
      
      document.body.removeChild(clone);

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20; // 10mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 10; // 10mm top margin

      // Add header to first page
      pdf.setFontSize(20);
      pdf.setTextColor(59, 130, 246); // Blue color
      pdf.text('Interview Evaluation Report', 10, position);
      
      pdf.setFontSize(12);
      pdf.setTextColor(107, 114, 128); // Gray color
      pdf.text(`Generated on ${new Date().toLocaleDateString()}`, 10, position + 10);
      
      position += 20;

      // Add first page image
      pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - position - 10);

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 20);
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `interview-evaluation-${candidateInfo.name.replace(/\s+/g, '-').toLowerCase()}-${timestamp}.pdf`;
      
      pdf.save(filename);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToWord = async () => {
    setIsExporting(true);
    try {
      // Convert markdown to plain text for Word document
      const plainText = evaluation.replace(/[#*`]/g, '').replace(/\n{2,}/g, '\n\n');
      
      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({
              text: 'Interview Evaluation Report',
              heading: HeadingLevel.TITLE,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Candidate: ${candidateInfo.name}`,
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Email: ${candidateInfo.email}`,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Generated on: ${new Date().toLocaleDateString()}`,
                }),
              ],
            }),
            new Paragraph({ text: '' }), // Empty line
            new Paragraph({
              children: [
                new TextRun({
                  text: plainText,
                }),
              ],
            }),
          ],
        }],
      });

      const buffer = await Packer.toBlob(doc);
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `interview-evaluation-${candidateInfo.name.replace(/\s+/g, '-').toLowerCase()}-${timestamp}.docx`;
      
      saveAs(buffer, filename);
    } catch (error) {
      console.error('Error exporting Word document:', error);
      alert('Failed to export Word document. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    if (evaluationRef.current) {
      const printContent = evaluationRef.current.innerHTML;
      const printWindow = window.open('', '_blank');
      
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Interview Evaluation - ${candidateInfo.name}</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 800px;
                  margin: 0 auto;
                  padding: 20px;
                }
                h1 { color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
                h2 { color: #374151; margin-top: 30px; }
                h3 { color: #4b5563; }
                pre { background: #f3f4f6; padding: 15px; border-radius: 5px; overflow-x: auto; }
                code { background: #f3f4f6; padding: 2px 4px; border-radius: 3px; }
                blockquote { border-left: 4px solid #3b82f6; padding-left: 16px; margin: 16px 0; font-style: italic; }
                .no-print { display: none !important; }
                @page { margin: 1in; }
              </style>
            </head>
            <body>
              ${printContent}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  const handleExport = (format: 'pdf' | 'docx' | 'print') => {
    setShowExportOptions(false);
    
    switch (format) {
      case 'pdf':
        exportToPDF();
        break;
      case 'docx':
        exportToWord();
        break;
      case 'print':
        handlePrint();
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full mb-6 shadow-lg">
            <CheckCircle className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Interview Completed Successfully!
          </h1>
          <p className="text-xl text-gray-600">
            Thank you for your time, <span className="font-semibold text-gray-800">{candidateInfo.name}</span>
          </p>
          <div className="mt-4 inline-flex items-center text-sm text-gray-500">
            <Calendar className="h-4 w-4 mr-2" />
            Completed on {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>

        {/* Session Summary Cards */}
        {sessionSummary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Duration</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatDuration(sessionSummary.duration)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Target className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                    <p className={`text-2xl font-bold ${getPerformanceColor(getSuccessRate())}`}>
                      {getSuccessRate()}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Code className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Code Runs</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {sessionSummary.codeExecutions}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <BookOpen className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Hints Used</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {sessionSummary.hintsUsed}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Evaluation Content */}
        <div 
          ref={evaluationRef}
          className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-8"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-white/20 rounded-lg mr-4">
                  <Award className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Interview Evaluation Report
                  </h2>
                  <p className="text-blue-100 text-sm mt-1">
                    Comprehensive analysis and feedback
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-blue-100">Generated on</div>
                <div className="text-white font-semibold">
                  {new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Candidate Info */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-8 py-6 border-b border-gray-200">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-600 mb-1">Candidate Name</h3>
                    <p className="text-xl font-bold text-gray-900">{candidateInfo.name}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-600 mb-1">Email Address</h3>
                    <p className="text-sm text-gray-700">{candidateInfo.email}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                {candidateInfo.experience && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-600 mb-1">Experience Level</h3>
                    <p className="text-sm text-gray-900 bg-white px-3 py-2 rounded-lg border">
                      {candidateInfo.experience}
                    </p>
                  </div>
                )}
                
                {candidateInfo.skills && candidateInfo.skills.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Technical Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {candidateInfo.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Evaluation Content */}
          <div className="px-8 py-8">
            <div className="prose prose-lg prose-blue max-w-none">
              <ReactMarkdown
                components={{
                  code({ className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = !match;
                    return !isInline ? (
                      <div className="my-6">
                        <SyntaxHighlighter
                          style={vscDarkPlus as any}
                          language={match[1]}
                          PreTag="div"
                          className="rounded-xl shadow-lg border border-gray-200"
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code className="bg-gray-100 text-gray-800 px-2 py-1 rounded-md text-sm font-mono border" {...props}>
                        {children}
                      </code>
                    );
                  },
                  h1: ({ children }) => (
                    <h1 className="text-3xl font-bold text-gray-900 mb-6 pb-4 border-b-2 border-blue-200 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4 mt-8 pb-2 border-b border-gray-200">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
                      {children}
                    </h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="text-lg font-semibold text-gray-800 mb-2 mt-4">
                      {children}
                    </h4>
                  ),
                  p: ({ children }) => (
                    <p className="text-gray-700 mb-4 leading-relaxed text-base">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-none pl-0 mb-6 space-y-2">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-6 mb-6 space-y-2">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-gray-700 relative pl-6 before:content-['•'] before:absolute before:left-0 before:text-blue-500 before:font-bold">
                      {children}
                    </li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-gray-900 bg-yellow-50 px-1 rounded">
                      {children}
                    </strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-gray-600">
                      {children}
                    </em>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-blue-500 pl-6 italic text-gray-600 my-6 bg-blue-50 py-4 rounded-r-lg">
                      {children}
                    </blockquote>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-6">
                      <table className="min-w-full divide-y divide-gray-200 border border-gray-300 rounded-lg">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-gray-50">
                      {children}
                    </thead>
                  ),
                  tbody: ({ children }) => (
                    <tbody className="bg-white divide-y divide-gray-200">
                      {children}
                    </tbody>
                  ),
                  th: ({ children }) => (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {children}
                    </td>
                  )
                }}
              >
                {evaluation}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
          {/* Export Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowExportOptions(!showExportOptions)}
              disabled={isExporting}
              className="inline-flex items-center px-8 py-4 border border-transparent text-base font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Download className="h-5 w-5 mr-2" />
              {isExporting ? 'Exporting...' : 'Export Report'}
              <ChevronDown className="h-4 w-4 ml-2" />
            </button>

            {showExportOptions && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-10">
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                >
                  <FileDown className="h-4 w-4 mr-3 text-red-500" />
                  Export as PDF
                </button>
                <button
                  onClick={() => handleExport('docx')}
                  className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                >
                  <FileText className="h-4 w-4 mr-3 text-blue-500" />
                  Export as Word
                </button>
                <button
                  onClick={() => handleExport('print')}
                  className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                >
                  <Printer className="h-4 w-4 mr-3 text-gray-500" />
                  Print Report
                </button>
              </div>
            )}
          </div>

          {/* Secondary Actions */}
          <div className="flex gap-4">
            {onStartNewInterview && (
              <button
                onClick={onStartNewInterview}
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <TrendingUp className="h-5 w-5 mr-2" />
                New Interview
              </button>
            )}

            {onBackToHome && (
              <button
                onClick={onBackToHome}
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <MessageSquare className="h-5 w-5 mr-2" />
                Back to Home
              </button>
            )}
          </div>
        </div>

        {/* Share Options */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center text-sm text-gray-500">
            <Share2 className="h-4 w-4 mr-2" />
            Share this report via email or download for your records
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="inline-block bg-white rounded-xl shadow-sm border border-gray-200 px-8 py-6">
            <div className="text-sm text-gray-600 space-y-1">
              <p className="font-medium">This evaluation was generated automatically by our AI interviewer system.</p>
              <p>Generated on {new Date().toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
              <p className="text-xs text-gray-400 mt-2">
                Report ID: {`INT-${Date.now().toString(36).toUpperCase()}`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
