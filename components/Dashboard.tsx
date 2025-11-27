import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ClassAnalysis, ProficiencyLevel, SkillStat } from '../types';
import { TrendingUp, AlertTriangle, CheckCircle, Users, Download, FileText, Printer } from 'lucide-react';
import FileSaver from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const minChartWidth = Math.max(100, skillChartData.length * 5);

  const totalStudents = data.students.length;
  const classAvg = Math.round(data.students.reduce((a,b) => a + b.overallScore, 0) / totalStudents);

  // --- PDF GENERATION LOGIC ---
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString();

    // Title
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // Indigo
    doc.text("Class Performance Dashboard", 14, 20);
    
    // Subheader
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${dateStr} | Total Students: ${totalStudents}`, 14, 28);

    // Executive Summary Box
    doc.setFillColor(243, 244, 246);
    doc.rect(14, 35, 182, 30, 'F');
    
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Executive Summary", 20, 45);
    
    doc.setFontSize(10);
    doc.text(`Class Average: ${classAvg}%`, 20, 55);
    doc.text(`Weakest Skill: ${data.weakestSkillsClasswide[0] || 'N/A'}`, 80, 55);
    doc.text(`Mastered Skills: ${Object.values(data.skillStats).filter((s: any) => s.avgAccuracy > 80).length}`, 140, 55);

    // Section 1: Proficiency Distribution
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229);
    doc.text("Proficiency Distribution", 14, 80);

    const distBody = [ProficiencyLevel.Strong, ProficiencyLevel.Moderate, ProficiencyLevel.Weak, ProficiencyLevel.Critical].map(level => {
        const count = proficiencyCounts[level];
        const pct = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
        return [level, count, `${pct}%`];
    });

    autoTable(doc, {
        startY: 85,
        head: [['Level', 'Count', 'Percentage']],
        body: distBody,
        theme: 'striped',
        headStyles: { fillColor: [100, 100, 100] }
    });

    // Section 2: Comprehensive Skills Matrix
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229);
    doc.text("Comprehensive Skills Matrix", 14, finalY);

    const skillsBody = (Object.values(data.skillStats) as SkillStat[])
        .sort((a,b) => a.avgAccuracy - b.avgAccuracy)
        .map(stat => [
            stat.skillCode,
            stat.description,
            `${stat.avgAccuracy.toFixed(1)}%`,
            stat.strongCount,
            stat.moderateCount,
            stat.weakCount,
            stat.criticalCount
        ]);

    autoTable(doc, {
        startY: finalY + 5,
        head: [['Code', 'Description', 'Avg Acc', 'Strong', 'Mod', 'Weak', 'Crit']],
        body: skillsBody,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
        columnStyles: {
            0: { fontStyle: 'bold' },
            6: { textColor: [239, 68, 68], fontStyle: 'bold' } // Critical column red
        }
    });

    doc.save(`Dashboard_Report_${dateStr.replace(/\//g, '-')}.pdf`);
  };

  const handleDownloadWord = () => {
    // 1. Construct HTML content
    const dateStr = new Date().toLocaleDateString();
    
    // Sort skills for table
    const sortedSkills = (Object.values(data.skillStats) as SkillStat[]).sort((a,b) => a.avgAccuracy - b.avgAccuracy);

    const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset='utf-8'>
            <title>Dashboard Report</title>
            <style>
                body { font-family: 'Calibri', sans-serif; font-size: 11pt; }
                h1 { font-size: 18pt; color: #2E74B5; margin-bottom: 5pt; }
                h2 { font-size: 14pt; color: #1F4D78; margin-top: 15pt; margin-bottom: 5pt; border-bottom: 1px solid #ddd; }
                .stat-box { border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; background: #f9f9f9; }
                table { border-collapse: collapse; width: 100%; margin-bottom: 15px; }
                th { background-color: #f0f0f0; border: 1px solid #999; padding: 5px; text-align: left; font-weight: bold; }
                td { border: 1px solid #999; padding: 5px; }
                .critical { color: #ef4444; font-weight: bold; }
                .strong { color: #22c55e; }
            </style>
        </head>
        <body>
            <h1>Class Performance Dashboard</h1>
            <p><strong>Date:</strong> ${dateStr} | <strong>Total Students:</strong> ${totalStudents}</p>

            <h2>Executive Summary</h2>
            <table style="border: none;">
                <tr style="border: none;">
                    <td style="border: none; width: 25%; background: #eef2ff; padding: 15px;">
                        <strong>Class Average</strong><br/>
                        <span style="font-size: 16pt;">${classAvg}%</span>
                    </td>
                    <td style="border: none; width: 25%; background: #fff7ed; padding: 15px;">
                        <strong>Weakest Skill</strong><br/>
                        <span style="font-size: 14pt;">${data.weakestSkillsClasswide[0] || 'N/A'}</span>
                    </td>
                     <td style="border: none; width: 25%; background: #f0fdf4; padding: 15px;">
                        <strong>Mastered Skills</strong><br/>
                        <span style="font-size: 16pt;">${(Object.values(data.skillStats) as SkillStat[]).filter(s => s.avgAccuracy > 80).length}</span>
                    </td>
                </tr>
            </table>

            <h2>Proficiency Distribution</h2>
            <table>
                <thead>
                    <tr>
                        <th>Proficiency Level</th>
                        <th>Student Count</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.keys(proficiencyCounts).map(level => {
                        const count = proficiencyCounts[level as ProficiencyLevel];
                        const pct = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
                        return `
                            <tr>
                                <td>${level}</td>
                                <td>${count}</td>
                                <td>${pct}%</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>

            <h2>Comprehensive Skills Matrix</h2>
            <table>
                <thead>
                    <tr>
                        <th>Skill Code</th>
                        <th>Description</th>
                        <th>Accuracy</th>
                        <th>Strong</th>
                        <th>Moderate</th>
                        <th>Weak</th>
                        <th>Critical</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedSkills.map(stat => `
                        <tr>
                            <td>${stat.skillCode}</td>
                            <td>${stat.description}</td>
                            <td>${stat.avgAccuracy.toFixed(1)}%</td>
                            <td>${stat.strongCount}</td>
                            <td>${stat.moderateCount}</td>
                            <td>${stat.weakCount}</td>
                            <td class="${stat.criticalCount > 0 ? 'critical' : ''}">${stat.criticalCount}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <p style="font-size: 9pt; color: #666; margin-top: 20px;">Generated by RemedialAI Planner</p>
        </body>
        </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    FileSaver.saveAs(blob, `Class_Dashboard_Report_${new Date().toISOString().split('T')[0]}.doc`);
  };

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
      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 no-print">
         <div>
             <h2 className="text-xl font-bold text-gray-800">Class Dashboard</h2>
             <p className="text-sm text-gray-500">Overview of student performance and skill gaps</p>
         </div>
         <div className="flex gap-3">
             <button 
                onClick={handleDownloadWord}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition-colors border border-blue-200"
             >
                 <FileText size={18} /> Export Word
             </button>
             <button 
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors shadow-sm"
             >
                 <Printer size={18} /> Download PDF Report
             </button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Students" 
          value={data.students.length} 
          icon={Users} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Class Average" 
          value={`${classAvg}%`} 
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
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col print-break-avoid">
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
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col print-break-avoid">
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

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col print-break-avoid">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">All Skills Performance</h3>
            <button 
                onClick={downloadSkillsReport}
                className="flex items-center gap-2 text-sm text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors no-print"
            >
                <Download size={16} /> Export CSV
            </button>
        </div>
        
        {/* Added scrollable container with sticky header for robustness with many skills */}
        <div className="overflow-x-auto border border-gray-100 rounded-lg max-h-[600px] overflow-y-auto custom-scrollbar print-no-scroll">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm print-no-sticky">
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
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center print-border">
    <div className={`${color} p-4 rounded-lg text-white mr-4 print-no-bg`}>
      <Icon size={24} className="print-dark-icon" />
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

export default Dashboard;