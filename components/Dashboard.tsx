import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ClassAnalysis, ProficiencyLevel, SkillStat } from '../types';
import { TrendingUp, AlertTriangle, CheckCircle, Users, Download } from 'lucide-react';

interface DashboardProps {
  data: ClassAnalysis;
}

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  // Prep Data for Charts
  const skillChartData = Object.values(data.skillStats).map((stat: SkillStat) => ({
    name: stat.skillCode,
    Accuracy: Math.round(stat.avgAccuracy),
    WeakStudents: stat.weakCount + stat.criticalCount
  }));

  const proficiencyCounts = {
    [ProficiencyLevel.Strong]: 0,
    [ProficiencyLevel.Moderate]: 0,
    [ProficiencyLevel.Weak]: 0,
    [ProficiencyLevel.Critical]: 0,
  };

  data.students.forEach(s => {
    const avg = s.overallScore;
    if (avg >= 80) proficiencyCounts[ProficiencyLevel.Strong]++;
    else if (avg >= 70) proficiencyCounts[ProficiencyLevel.Moderate]++;
    else if (avg >= 50) proficiencyCounts[ProficiencyLevel.Weak]++;
    else proficiencyCounts[ProficiencyLevel.Critical]++;
  });

  const pieData = Object.keys(proficiencyCounts).map(key => ({
    name: key,
    value: proficiencyCounts[key as ProficiencyLevel]
  }));

  const COLORS = {
    [ProficiencyLevel.Strong]: '#22c55e',
    [ProficiencyLevel.Moderate]: '#eab308',
    [ProficiencyLevel.Weak]: '#f97316',
    [ProficiencyLevel.Critical]: '#ef4444',
  };

  // Dynamic width for bar chart
  // Reduced multiplier to 5 to make it less wide/aggressive
  const minChartWidth = Math.max(100, skillChartData.length * 5);

  const totalStudents = data.students.length;

  const downloadSkillsReport = () => {
    const headers = ['Skill Code', 'Description', 'Avg Accuracy', 'Strong', 'Moderate', 'Weak', 'Critical'];
    const rows = Object.values(data.skillStats).map((s: SkillStat) => [
        s.skillCode,
        `"${s.description}"`,
        s.avgAccuracy.toFixed(2),
        s.strongCount,
        s.moderateCount,
        s.weakCount,
        s.criticalCount
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rows.map(e => e.join(",")).join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "class_skills_performance.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Students" 
          value={data.students.length} 
          icon={Users} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Class Average" 
          value={`${Math.round(data.students.reduce((a,b) => a + b.overallScore, 0) / data.students.length)}%`} 
          icon={TrendingUp} 
          color="bg-indigo-500" 
        />
        <StatCard 
          title="Weakest Skill" 
          value={data.weakestSkillsClasswide[0] || 'N/A'} 
          icon={AlertTriangle} 
          color="bg-orange-500" 
        />
        <StatCard 
          title="Mastered Skills" 
          value={Object.values(data.skillStats).filter((s: SkillStat) => s.avgAccuracy > 80).length} 
          icon={CheckCircle} 
          color="bg-green-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skill Performance Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Skill Performance Overview</h3>
          <div className="flex-1 overflow-x-auto custom-scrollbar">
             <div style={{ width: `${minChartWidth}%`, minWidth: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={skillChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="Accuracy" fill="#6366f1" radius={[4, 4, 0, 0]} name="Avg Accuracy %" barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>

        {/* Student Distribution Pie & Table */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Class Proficiency Distribution</h3>
          <div className="flex flex-col md:flex-row items-center gap-6 h-full">
            <div className="h-64 w-full md:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name as ProficiencyLevel]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
            </div>
            
            {/* Distribution Table */}
            <div className="w-full md:w-1/2 overflow-hidden rounded-lg border border-gray-100">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Level</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-500">Count</th>
                            <th className="px-3 py-2 text-right font-medium text-gray-500">%</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {[ProficiencyLevel.Strong, ProficiencyLevel.Moderate, ProficiencyLevel.Weak, ProficiencyLevel.Critical].map((level) => {
                            const count = proficiencyCounts[level];
                            const percentage = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
                            return (
                                <tr key={level}>
                                    <td className="px-3 py-2 flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[level] }}></div>
                                        <span className="text-gray-700">{level}</span>
                                    </td>
                                    <td className="px-3 py-2 text-center font-medium text-gray-900">{count}</td>
                                    <td className="px-3 py-2 text-right text-gray-500">{percentage}%</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">All Skills Performance</h3>
            <button 
                onClick={downloadSkillsReport}
                className="flex items-center gap-2 text-sm text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
            >
                <Download size={16} /> Export CSV
            </button>
        </div>
        
        {/* Added scrollable container with sticky header for robustness with many skills */}
        <div className="overflow-x-auto border border-gray-100 rounded-lg max-h-[600px] overflow-y-auto custom-scrollbar">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Skill Code</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Avg Accuracy</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-green-700 bg-green-50 uppercase tracking-wider">Strong</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-yellow-700 bg-yellow-50 uppercase tracking-wider">Moderate</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-orange-700 bg-orange-50 uppercase tracking-wider">Weak</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-red-700 bg-red-50 uppercase tracking-wider">Critical</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {Object.values(data.skillStats)
                        .sort((a: SkillStat, b: SkillStat) => a.avgAccuracy - b.avgAccuracy)
                        .map((stat: SkillStat) => (
                        <tr key={stat.skillCode} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{stat.skillCode}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat.description}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${stat.avgAccuracy < 70 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-700'}`}>
                                    {stat.avgAccuracy.toFixed(1)}%
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">{stat.strongCount}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">{stat.moderateCount}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 font-medium text-orange-600">{stat.weakCount}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 font-bold text-red-600">{stat.criticalCount}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
    <div className={`${color} p-4 rounded-lg text-white mr-4`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

export default Dashboard;