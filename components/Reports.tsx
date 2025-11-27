import React, { useState } from 'react';
import { ClassAnalysis, StudentAnalysis, TeacherProfile } from '../types';
import { generateParentReport } from '../services/geminiService';
import { FileText, Download, Send, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';

interface ReportsProps {
  data: ClassAnalysis;
  teacherProfile: TeacherProfile;
}

const Reports: React.FC<ReportsProps> = ({ data, teacherProfile }) => {
  const [selectedStudent, setSelectedStudent] = useState<StudentAnalysis | null>(null);
  const [reportText, setReportText] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (student: StudentAnalysis) => {
    setSelectedStudent(student);
    setLoading(true);
    setReportText('');
    
    // Identify weak skills for context
    const weakSkills = student.skillPerformances
        .filter(s => s.accuracy < 70)
        .map(s =>({ code: s.skillCode, desc: s.skillDescription }));

    try {
        const text = await generateParentReport(student.studentName, weakSkills, teacherProfile);
        setReportText(text);
    } catch (e) {
        console.error(e);
        setReportText("Error generating report.");
    } finally {
        setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!selectedStudent || !reportText) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Parent Report: ${selectedStudent.studentName}`, 10, 20);
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(reportText.replace(/#/g, ''), 180);
    doc.text(lines, 10, 30);
    doc.save(`Report_${selectedStudent.studentName.replace(/\s/g, '_')}.pdf`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
      {/* Student List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-gray-700">Select Student</h3>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {data.students.map(student => (
                <div 
                    key={student.studentId}
                    onClick={() => handleGenerate(student)}
                    className={`p-3 rounded-lg cursor-pointer flex justify-between items-center ${
                        selectedStudent?.studentId === student.studentId 
                        ? 'bg-indigo-50 border border-indigo-200' 
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                >
                    <div>
                        <p className="font-medium text-gray-800 text-sm">{student.studentName}</p>
                        <p className="text-xs text-gray-500">ID: {student.studentId}</p>
                    </div>
                    <div className={`text-xs font-bold px-2 py-1 rounded ${
                        student.overallScore < 70 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                        {Math.round(student.overallScore)}%
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Report Preview */}
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
        {selectedStudent ? (
            <>
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <div>
                        <h3 className="font-bold text-gray-800">Draft Report: {selectedStudent.studentName}</h3>
                        <p className="text-xs text-gray-500">AI Generated • Grade {teacherProfile.gradeLevel}</p>
                    </div>
                    {reportText && !loading && (
                        <button 
                            onClick={handleDownload}
                            className="flex items-center gap-2 text-sm bg-white border border-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            <Download size={16} /> Download PDF
                        </button>
                    )}
                </div>
                <div className="p-8 flex-1 overflow-y-auto font-serif text-gray-700 leading-relaxed bg-white">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-4">
                            <Loader2 className="animate-spin text-indigo-500" size={32} />
                            <p className="text-sm text-gray-500">Drafting personalized letter for {teacherProfile.name}...</p>
                        </div>
                    ) : (
                        <div className="whitespace-pre-wrap">
                            {reportText}
                        </div>
                    )}
                </div>
            </>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <FileText size={48} className="mb-4 text-gray-200" />
                <p>Select a student to generate a parent report.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Reports;