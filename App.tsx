import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import UploadView from './components/UploadView';
import RemedialPlanner from './components/RemedialPlanner';
import Reports from './components/Reports';
import OnboardingView from './components/OnboardingView';
import { ClassAnalysis, SkillStat, TeacherProfile } from './types';
import { Users, BarChart2 } from 'lucide-react';

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
        return analysisData ? <ClassSummaryView data={analysisData} /> : <RedirectToUpload />;
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

const ClassSummaryView = ({ data }: { data: ClassAnalysis }) => {
  const [activeTab, setActiveTab] = useState<'students' | 'skills'>('students');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Class Analysis</h2>
              <p className="text-sm text-gray-500">Comprehensive breakdown by student and skill.</p>
            </div>
            
            <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                  onClick={() => setActiveTab('students')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'students' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Users size={16} /> Students
                </button>
                <button 
                  onClick={() => setActiveTab('skills')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'skills' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <BarChart2 size={16} /> Skills Matrix
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