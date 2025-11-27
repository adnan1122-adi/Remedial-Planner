import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import UploadView from './components/UploadView';
import RemedialPlanner from './components/RemedialPlanner';
import Reports from './components/Reports';
import OnboardingView from './components/OnboardingView';
import { ClassAnalysis, SkillStat, TeacherProfile } from './types';
import { Users, BarChart2, FileText, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import FileSaver from 'file-saver';

const App: React.FC = () => {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [currentView, setCurrentView] = useState('upload');
  const [analysisData, setAnalysisData] = useState<ClassAnalysis | null>(null);

  const handleDataLoaded = (data: ClassAnalysis) => {
    setAnalysisData(data);
    setCurrentView('dashboard');
  };

  if (!profile) {
    return <OnboardingView onComplete={setProfile} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'upload':
        return <UploadView onDataLoaded={handleDataLoaded} />;
      case 'dashboard':
        return analysisData ? <Dashboard data={analysisData} /> : <RedirectToUpload />;
      case 'class-summary':
        return analysisData ? <ClassSummaryView data={analysisData} teacherProfile={profile} /> : <RedirectToUpload />;
      case 'planner':
        return analysisData ? <RemedialPlanner data={analysisData} teacherProfile={profile} /> : <RedirectToUpload />;
      case 'reports':
        return analysisData ? <Reports data={analysisData} teacherProfile={profile} /> : <RedirectToUpload />;
      default:
        return <UploadView onDataLoaded={handleDataLoaded} />;
    }
  };

  return (
    <Layout 
      currentView={currentView} 
      onChangeView={setCurrentView}
      hasData={!!analysisData}
      teacherProfile={profile}
    >
      {renderView()}
    </Layout>
  );
};

// Helper components
const RedirectToUpload = () => (
  <div className="flex flex-col items-center justify-center h-full text-gray-500">
    <p>Please upload data first.</p>
  </div>
);

const ClassSummaryView = ({ data, teacherProfile }: { data: ClassAnalysis, teacherProfile: TeacherProfile }) => {
  const [activeTab, setActiveTab] = useState<'students' | 'skills'>('students');

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Class Analysis Report`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Teacher: ${teacherProfile.name} | Grade: ${teacherProfile.gradeLevel}`, 14, 30);
    
    // Summary Stats
    const totalStudents = data.students.length;
    const avgScore = Math.round(data.students.reduce((a, b) => a + b.overallScore, 0) / totalStudents);
    doc.text(`Total Students: ${totalStudents} | Class Average: ${avgScore}%`, 14, 40);

    // Section 1: Student Roster
    doc.text("Student Performance Roster", 14, 55);
    
    const studentBody = data.students.map(s => [
        s.studentName,
        s.studentId,
        Math.round(s.overallScore) + '%',
        s.weakestSkills[0]?.skillCode || 'None',
        s.overallScore < 70 ? 'Remedial' : 'On Track'
    ]);

    autoTable(doc, {
        startY: 60,
        head: [['Name', 'ID', 'Score', 'Weakest Skill', 'Status']],
        body: studentBody,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] }
    });

    // Section 2: Skills Matrix
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.text("Skills Performance Matrix", 14, finalY);

    const skillsBody = Object.values(data.skillStats).map((s: SkillStat) => [
        s.skillCode,
        s.description,
        s.avgAccuracy.toFixed(1) + '%',
        s.weakCount,
        s.criticalCount
    ]);

    autoTable(doc, {
        startY: finalY + 5,
        head: [['Code', 'Description', 'Avg Acc', 'Weak', 'Critical']],
        body: skillsBody,
        theme: 'grid',
        headStyles: { fillColor: [220, 38, 38] } // Red header for skills
    });

    doc.save('Class_Analysis_Report.pdf');
  };

  const handleDownloadWord = () => {
    const dateStr = new Date().toLocaleDateString();
    
    // Build tables HTML
    const studentRows = data.students.map(s => `
        <tr>
            <td>${s.studentName}</td>
            <td>${Math.round(s.overallScore)}%</td>
            <td>${s.weakestSkills[0]?.skillCode || 'N/A'}</td>
            <td style="color:${s.overallScore < 70 ? 'red' : 'green'}">${s.overallScore < 70 ? 'Remedial' : 'On Track'}</td>
        </tr>
    `).join('');

    const skillRows = Object.values(data.skillStats).map((s: SkillStat) => `
        <tr>
            <td>${s.skillCode}</td>
            <td>${s.description}</td>
            <td>${s.avgAccuracy.toFixed(1)}%</td>
            <td>${s.weakCount}</td>
            <td style="font-weight:bold; color: red;">${s.criticalCount}</td>
        </tr>
    `).join('');

    const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset='utf-8'>
            <title>Class Analysis</title>
            <style>
                body { font-family: 'Calibri', sans-serif; font-size: 11pt; }
                h1 { font-size: 18pt; color: #4F46E5; }
                h2 { font-size: 14pt; color: #333; margin-top: 20px; border-bottom: 1px solid #ccc; }
                table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
                th { background-color: #f3f4f6; border: 1px solid #999; padding: 5px; text-align: left; }
                td { border: 1px solid #999; padding: 5px; }
            </style>
        </head>
        <body>
            <h1>Class Analysis Report</h1>
            <p><strong>Teacher:</strong> ${teacherProfile.name} | <strong>Date:</strong> ${dateStr}</p>
            
            <h2>Student Roster</h2>
            <table>
                <thead>
                    <tr><th>Name</th><th>Score</th><th>Weakest Skill</th><th>Status</th></tr>
                </thead>
                <tbody>${studentRows}</tbody>
            </table>

            <h2>Skills Matrix</h2>
            <table>
                <thead>
                    <tr><th>Skill Code</th><th>Description</th><th>Accuracy</th><th>Weak Count</th><th>Critical Count</th></tr>
                </thead>
                <tbody>${skillRows}</tbody>
            </table>
        </body>
        </html>
    `;
    
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    FileSaver.saveAs(blob, `Class_Analysis_${dateStr}.doc`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Class Analysis</h2>
              <p className="text-sm text-gray-500">Comprehensive breakdown by student and skill.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                      onClick={() => setActiveTab('students')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        activeTab === 'students' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Users size={16} /> Students
                    </button>
                    <button 
                      onClick={() => setActiveTab('skills')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        activeTab === 'skills' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <BarChart2 size={16} /> Skills
                    </button>
                </div>
                <div className="h-6 w-px bg-gray-300 mx-1 hidden md:block"></div>
                <button 
                   onClick={handleDownloadWord}
                   className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors border border-blue-200"
                >
                   <FileText size={16} /> Word
                </button>
                <button 
                   onClick={handleDownloadPDF}
                   className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors border border-red-200"
                >
                   <Printer size={16} /> PDF
                </button>
            </div>
        </div>

        {activeTab === 'students' ? (
           <StudentRoster data={data} />
        ) : (
           <SkillsTable data={data} />
        )}
      </div>
    </div>
  );
};

const StudentRoster = ({ data }: { data: ClassAnalysis }) => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
              <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overall Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weakest Skill</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
              {data.students.map((s) => (
                  <tr key={s.studentId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{s.studentName}</div>
                          <div className="text-sm text-gray-500">{s.studentId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-bold text-gray-700">{Math.round(s.overallScore)}%</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {s.weakestSkills.length > 0 ? (
                              <span className="bg-red-50 text-red-700 px-2 py-1 rounded-md text-xs font-medium">
                                  {s.weakestSkills[0].skillCode}
                              </span>
                          ) : (
                              <span className="text-green-600 text-xs">All Strong</span>
                          )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                          {s.overallScore < 70 ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">Remedial Needed</span>
                          ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">On Track</span>
                          )}
                      </td>
                  </tr>
              ))}
          </tbody>
      </table>
    </div>
);

const SkillsTable = ({ data }: { data: ClassAnalysis }) => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
              <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skill Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class Avg</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weak Students</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Critical Students</th>
              </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
              {Object.values(data.skillStats)
                .sort((a,b) => a.avgAccuracy - b.avgAccuracy)
                .map((stat: SkillStat) => (
                  <tr key={stat.skillCode} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">
                          {stat.skillCode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {stat.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className={`text-sm font-bold mr-2 ${stat.avgAccuracy < 70 ? 'text-red-600' : 'text-green-600'}`}>
                                {stat.avgAccuracy.toFixed(1)}%
                            </span>
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full ${stat.avgAccuracy < 70 ? 'bg-red-500' : 'bg-green-500'}`} 
                                    style={{ width: `${stat.avgAccuracy}%` }}
                                ></div>
                            </div>
                          </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {stat.weakCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {stat.criticalCount > 0 ? (
                             <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded">
                                 {stat.criticalCount}
                             </span>
                          ) : (
                             <span className="text-gray-400">0</span>
                          )}
                      </td>
                  </tr>
              ))}
          </tbody>
      </table>
    </div>
);

export default App;