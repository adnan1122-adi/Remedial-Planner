import React, { useState } from 'react';
import { ClassAnalysis, RemedialGroup, RemedialPlan, GeneratedContent, ProficiencyLevel, TeacherProfile } from '../types';
import { generateRemedialPlan, generateWorksheet, generateSmartGoal } from '../services/geminiService';
import { Users, Clock, Target, FileText, Download, Loader2, Sparkles, ChevronDown, ChevronUp, FileType, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import FileSaver from 'file-saver';

interface PlannerProps {
  data: ClassAnalysis;
  teacherProfile: TeacherProfile;
}

const RemedialPlanner: React.FC<PlannerProps> = ({ data, teacherProfile }) => {
  const [selectedGroup, setSelectedGroup] = useState<RemedialGroup | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<Record<string, GeneratedContent>>({}); // key is group ID

  // Sort groups by number of students (prioritize larger groups)
  const sortedGroups = [...data.groups].sort((a, b) => b.students.length - a.students.length);

  const handleGenerate = async (group: RemedialGroup) => {
    setLoading(true);
    try {
      // Parallel generation for better UX
      const [plan, worksheet, goal] = await Promise.all([
        generateRemedialPlan(group.skillCode, group.skillDescription, "Small Group", "30 min", teacherProfile),
        generateWorksheet(group.skillCode, group.skillDescription, teacherProfile),
        generateSmartGoal(group.skillCode, 60, teacherProfile) // Assuming avg around 60 for remedial group
      ]);

      setGeneratedContent(prev => ({
        ...prev,
        [group.id]: {
          remedialPlan: plan,
          worksheetContent: worksheet,
          smartGoal: goal
        }
      }));
    } catch (e) {
      alert("Error generating content. Please check your API Key.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintPDF = (group: RemedialGroup, type: 'worksheet' | 'plan') => {
    const content = generatedContent[group.id];
    if (!content) return;

    // We use the browser's native print-to-pdf capability for the highest fidelity
    // especially for Math/KaTeX which is very hard to render purely with jsPDF text.
    
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;

    let htmlBody = '';

    if (type === 'worksheet') {
       // Grab the rendered HTML directly from the DOM to preserve KaTeX
       const previewElement = document.getElementById(`worksheet-preview-content-${group.id}`);
       if (previewElement) {
           htmlBody = previewElement.innerHTML;
       } else {
           // Fallback if DOM not found (shouldn't happen if view is active)
           htmlBody = `<p>Error: Could not find worksheet content. Please generate it first.</p>`;
       }
    } else {
        // Build Plan HTML manually
        htmlBody = `
            <h1>Remedial Lesson Plan</h1>
            <h2>${group.skillCode}: ${group.skillDescription}</h2>
            <p><strong>Teacher:</strong> ${teacherProfile.name}</p>
            <p><strong>Grade:</strong> ${teacherProfile.gradeLevel}</p>
            <hr/>
            <h3>Objective</h3>
            <p>${content.remedialPlan?.objective}</p>
            <h3>SMART Goal</h3>
            <p>${content.smartGoal?.fullStatement}</p>
            <h3>Lesson Flow</h3>
            <ul>
                <li><strong>Warm Up:</strong> ${content.remedialPlan?.lessonFlow.warmUp}</li>
                <li><strong>Mini Lesson:</strong> ${content.remedialPlan?.lessonFlow.miniLesson}</li>
                <li><strong>Guided Practice:</strong> ${content.remedialPlan?.lessonFlow.guidedPractice}</li>
                <li><strong>Independent Practice:</strong> ${content.remedialPlan?.lessonFlow.independentPractice}</li>
                <li><strong>Assessment:</strong> ${content.remedialPlan?.lessonFlow.assessment}</li>
                <li><strong>Exit Ticket:</strong> ${content.remedialPlan?.lessonFlow.exitTicket}</li>
            </ul>
        `;
    }

    printWindow.document.write(`
        <html>
            <head>
                <title>${group.skillCode} - ${type === 'worksheet' ? 'Worksheet' : 'Plan'}</title>
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.css">
                <style>
                    body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #111; padding: 40px; }
                    h1 { font-size: 24px; margin-bottom: 10px; color: #000; }
                    h2 { font-size: 18px; margin-bottom: 20px; color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
                    h3 { font-size: 16px; margin-top: 20px; color: #444; text-transform: uppercase; letter-spacing: 0.5px; }
                    p { margin-bottom: 12px; }
                    ul, ol { margin-bottom: 15px; padding-left: 25px; }
                    li { margin-bottom: 8px; }
                    .katex { font-size: 1.1em; } 
                    /* Print specific optimizations */
                    @media print {
                        body { padding: 0; }
                        @page { margin: 2cm; size: auto; }
                        .no-print { display: none; }
                        /* Avoid breaking inside questions or headers */
                        h1, h2, h3, li { page-break-inside: avoid; }
                        p { page-break-inside: auto; }
                    }
                </style>
            </head>
            <body>
                ${htmlBody}
                <script>
                    window.onload = function() { window.print(); window.close(); }
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
  };

  // Helper to convert LaTeX string to Word-friendly HTML
  const formatLatexForWord = (latex: string) => {
      let html = latex;
      
      // Symbol Mapping
      const symbols: Record<string, string> = {
          '\\\\times': '×',
          '\\\\div': '÷',
          '\\\\cdot': '⋅',
          '\\\\pm': '±',
          '\\\\leq': '≤',
          '\\\\geq': '≥',
          '\\\\neq': '≠',
          '\\\\approx': '≈',
          '\\\\pi': 'π',
          '\\\\alpha': 'α',
          '\\\\beta': 'β',
          '\\\\theta': 'θ',
          '\\\\sqrt': '√',
          '\\\\infty': '∞',
          '\\\\degree': '°',
          '\\\\angle': '∠'
      };

      Object.keys(symbols).forEach(key => {
          html = html.replace(new RegExp(key, 'g'), symbols[key]);
      });

      // Fractions: \frac{a}{b} -> (a/b)
      // This handles standard single-level fractions well.
      html = html.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1/$2)');

      // Superscripts: ^{...} or ^x -> <sup>...</sup>
      html = html.replace(/\^\{([^{}]+)\}/g, '<sup>$1</sup>');
      html = html.replace(/\^([0-9a-zA-Z]+)/g, '<sup>$1</sup>');

      // Subscripts: _{...} or _x -> <sub>...</sub>
      html = html.replace(/_\{([^{}]+)\}/g, '<sub>$1</sub>');
      html = html.replace(/_([0-9a-zA-Z]+)/g, '<sub>$1</sub>');

      // Remove \text{...} wrapper
      html = html.replace(/\\text\{([^{}]+)\}/g, '$1');

      // Clean up other backslashes for unsupported commands
      html = html.replace(/\\([a-zA-Z]+)/g, ' $1 ');

      // Cleanup stray braces
      html = html.replace(/[{}]/g, '');

      return html;
  };

  const exportWord = (group: RemedialGroup) => {
    const content = generatedContent[group.id];
    if (!content || !content.worksheetContent) return;

    // Robust Markdown to HTML converter for Word
    let md = content.worksheetContent;

    // 1. Handle Math First (Convert LaTeX to HTML-friendly text)
    // Replace $...$ blocks with formatted HTML span
    md = md.replace(/\$([^\$]+)\$/gim, (match, p1) => {
        return `<span style="font-family: 'Cambria Math', serif; background-color: #f9f9f9;">${formatLatexForWord(p1)}</span>`;
    });
    // Handle block math $$...$$
    md = md.replace(/\$\$([^\$]+)\$\$/gim, (match, p1) => {
        return `<div style="font-family: 'Cambria Math', serif; background-color: #f9f9f9; padding: 5px; margin: 5px 0; text-align: center;">${formatLatexForWord(p1)}</div>`;
    });

    // 2. Convert Headers
    md = md.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    md = md.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    md = md.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    
    // 3. Horizontal Rules
    md = md.replace(/^---$/gm, '<hr/>');

    // 4. Convert Bold/Italic
    md = md.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    md = md.replace(/\*(.*?)\*/g, '<i>$1</i>');
    md = md.replace(/__(.*?)__/g, '<b>$1</b>');
    md = md.replace(/_(.*?)_/g, '<i>$1</i>');

    // 5. Handle Lists (Improved for Word)
    // Use styled <p> instead of <li>. This is much more reliable in Word HTML import.
    
    // Numbered Lists (e.g. 1. Answer)
    md = md.replace(/^\s*(\d+)\.\s+(.*)$/gm, '<p style="margin-left: 20px; text-indent: -20px; margin-bottom: 5pt;"><b>$1.</b> $2</p>');
    
    // Bullet Lists (e.g. - Answer or * Answer)
    md = md.replace(/^\s*[\-\*]\s+(.*)$/gm, '<p style="margin-left: 20px; text-indent: -10px; margin-bottom: 5pt;">• $1</p>');

    // 6. Page Break before Answer Key
    // Looks for the "Answer Key" header (H2 or H3) and adds a page break before it. 
    // Uses mso-special-character logic which Word prefers.
    md = md.replace(/(<h[23]>\s*Answer Key\s*<\/h[23]>)/i, '<br clear=all style="mso-special-character:line-break;page-break-before:always" />$1');

    // 7. Line breaks for paragraphs
    // Clean up newlines around block elements to avoid huge gaps
    md = md.replace(/(<\/?(h\d|p|div|hr)>)\n/g, '$1'); 
    
    // Replace double newlines with breaks
    md = md.replace(/\n\n/g, '<br/><br/>');
    // Replace single newlines with breaks
    md = md.replace(/\n/g, '<br/>');

    const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset='utf-8'>
            <title>Worksheet</title>
            <style>
                body { font-family: 'Calibri', sans-serif; font-size: 11pt; line-height: 1.5; }
                h1 { font-size: 18pt; color: #2E74B5; margin-bottom: 12pt; }
                h2 { font-size: 14pt; color: #1F4D78; border-bottom: 1px solid #ddd; padding-bottom: 4pt; margin-top: 18pt; margin-bottom: 6pt; }
                h3 { font-size: 12pt; color: #1F4D78; font-weight: bold; margin-top: 12pt; }
                p { margin-bottom: 10pt; }
                .header-table { width: 100%; border-bottom: 2px solid #000; margin-bottom: 20px; padding-bottom: 10px; }
                .header-td { padding: 5px; font-weight: bold; }
                /* Ensure questions don't break awkwardly across pages */
                li, h3, p { page-break-inside: avoid; }
            </style>
        </head>
        <body>
            <!-- Professional Header -->
            <table class="header-table">
                <tr>
                    <td class="header-td">Name: __________________________</td>
                    <td class="header-td" style="text-align: right;">Date: ________________</td>
                </tr>
                 <tr>
                    <td class="header-td">Topic: ${group.skillDescription}</td>
                    <td class="header-td" style="text-align: right;">Score: _______ / _______</td>
                </tr>
            </table>
            
            ${md}
            
            <br/><br/>
            <p style="font-size: 9pt; color: #666; text-align: center;">Generated by RemedialAI Planner</p>
        </body>
        </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], {
        type: 'application/msword'
    });
    
    FileSaver.saveAs(blob, `${group.skillCode}_Worksheet.doc`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Remedial Groups</h2>
          <p className="text-gray-500">
             Targeted interventions for Grade {teacherProfile.gradeLevel} {teacherProfile.subject}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Groups List - Narrower Column */}
        <div className="lg:col-span-3 space-y-4 max-h-[calc(100vh-140px)] overflow-y-auto pr-2">
          {sortedGroups.map(group => (
            <div 
              key={group.id}
              onClick={() => setSelectedGroup(group)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedGroup?.id === group.id 
                ? 'bg-indigo-50 border-indigo-500 shadow-md transform scale-[1.02]' 
                : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-sm'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded font-semibold">
                  {group.skillCode}
                </span>
                <span className="flex items-center text-gray-500 text-xs">
                  <Users size={14} className="mr-1" /> {group.students.length}
                </span>
              </div>
              <h3 className="font-medium text-gray-800 mb-1 line-clamp-2">{group.skillDescription}</h3>
              <div className="flex -space-x-2 overflow-hidden mt-3">
                {group.students.slice(0, 4).map(s => (
                  <div key={s.studentId} className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600" title={s.studentName}>
                    {s.studentName.charAt(0)}
                  </div>
                ))}
                {group.students.length > 4 && (
                    <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                        +{group.students.length - 4}
                    </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Detail & AI View - Wider Column */}
        <div className="lg:col-span-9">
          {selectedGroup ? (
            <div className="space-y-6">
              {/* Header Card */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    {selectedGroup.skillCode} Intervention
                  </h3>
                  <p className="text-gray-500">{selectedGroup.skillDescription}</p>
                </div>
                <div>
                  {!generatedContent[selectedGroup.id] ? (
                    <button 
                      onClick={() => handleGenerate(selectedGroup)}
                      disabled={loading}
                      className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:opacity-90 disabled:opacity-50 transition-all shadow-md font-medium"
                    >
                      {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                      Generate Plan & Worksheet
                    </button>
                  ) : (
                    <div className="flex gap-2">
                         <button 
                          onClick={() => handlePrintPDF(selectedGroup, 'plan')}
                          className="flex items-center gap-2 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"
                        >
                          <FileText size={16} />
                          Print Plan
                        </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Content Area */}
              <div className="animate-fade-in">
                {!generatedContent[selectedGroup.id] ? (
                   <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 flex flex-col items-center justify-center text-gray-400 min-h-[400px]">
                     <div className="bg-indigo-50 p-6 rounded-full mb-4">
                       <Sparkles size={48} className="text-indigo-400" />
                     </div>
                     <p className="text-lg font-medium text-gray-600">Ready to create content</p>
                     <p className="text-center max-w-sm mt-2">
                       Click "Generate" to create a custom lesson plan, math worksheet (with LaTeX support), and SMART goal for Grade {teacherProfile.gradeLevel} students.
                     </p>
                   </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column: Plan & Goal */}
                    <div className="space-y-6">
                        <div className="bg-green-50 border border-green-100 rounded-xl p-6 shadow-sm">
                           <h4 className="flex items-center gap-2 font-bold text-green-800 mb-2">
                             <Target size={20} /> SMART Goal
                           </h4>
                           <p className="text-green-900 text-lg">"{generatedContent[selectedGroup.id].smartGoal?.fullStatement}"</p>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                           <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                               <h4 className="flex items-center gap-2 font-bold text-gray-800">
                                 <Clock size={20} /> 30-Minute Lesson Plan
                               </h4>
                           </div>
                           <div className="p-6 space-y-4">
                              <PlanItem title="Objective" content={generatedContent[selectedGroup.id].remedialPlan?.objective} isHighlight />
                              <PlanItem title="Warm Up (5 min)" content={generatedContent[selectedGroup.id].remedialPlan?.lessonFlow.warmUp} />
                              <PlanItem title="Mini Lesson (10 min)" content={generatedContent[selectedGroup.id].remedialPlan?.lessonFlow.miniLesson} />
                              <PlanItem title="Guided Practice (10 min)" content={generatedContent[selectedGroup.id].remedialPlan?.lessonFlow.guidedPractice} />
                           </div>
                        </div>
                    </div>

                    {/* Right Column: Worksheet Preview */}
                    <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h4 className="flex items-center gap-2 font-bold text-gray-800">
                                <FileText size={20} /> Worksheet Preview
                            </h4>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => exportWord(selectedGroup)}
                                    className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 text-xs font-medium shadow-sm transition-colors"
                                    title="Download Editable Word Doc"
                                >
                                    <FileType size={14} /> Word
                                </button>
                                <button 
                                    onClick={() => handlePrintPDF(selectedGroup, 'worksheet')}
                                    className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 text-xs font-medium shadow-sm transition-colors"
                                    title="Download/Print PDF"
                                >
                                    <Printer size={14} /> PDF (Print)
                                </button>
                            </div>
                        </div>

                        {/* Paper Preview Container */}
                        <div className="bg-gray-100 rounded-xl p-4 md:p-6 flex-1 border border-gray-300 overflow-y-auto max-h-[800px] shadow-inner flex justify-center">
                            <div 
                                id={`worksheet-preview-content-${selectedGroup.id}`}
                                className="worksheet-paper bg-white shadow-xl w-full max-w-[210mm] min-h-[297mm] p-[20mm] text-gray-800 transition-transform hover:scale-[1.01] duration-300 origin-top"
                            >
                                <div className="prose prose-sm md:prose-base max-w-none font-serif">
                                    <ReactMarkdown 
                                        remarkPlugins={[remarkMath]} 
                                        rehypePlugins={[rehypeKatex]}
                                    >
                                        {generatedContent[selectedGroup.id].worksheetContent || ''}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 min-h-[500px]">
                <Users size={48} className="mb-4 text-gray-300" />
                <p className="text-lg">Select a remedial group from the left to start planning.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PlanItem = ({ title, content, isHighlight }: { title: string, content?: string, isHighlight?: boolean }) => (
    <div className={`p-4 rounded-lg border shadow-sm ${isHighlight ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-gray-100'}`}>
        <h5 className={`font-semibold text-sm mb-1 ${isHighlight ? 'text-indigo-900' : 'text-gray-700'}`}>{title}</h5>
        <p className="text-gray-600 text-sm leading-relaxed">{content || "Loading..."}</p>
    </div>
);

export default RemedialPlanner;