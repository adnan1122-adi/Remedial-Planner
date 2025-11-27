import React, { useCallback } from 'react';
import { Upload, FileSpreadsheet, Play, Download } from 'lucide-react';
import { parseExcelData, generateDemoData, downloadTemplate } from '../services/dataProcessor';
import { ClassAnalysis } from '../types';

interface UploadViewProps {
  onDataLoaded: (data: ClassAnalysis) => void;
}

const UploadView: React.FC<UploadViewProps> = ({ onDataLoaded }) => {
  const [error, setError] = React.useState<string | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const data = await parseExcelData(file);
      onDataLoaded(data);
    } catch (err: any) {
      setError(err.message || 'Failed to parse Excel file. Ensure strict format.');
    } finally {
      setIsProcessing(false);
    }
  };

  const loadDemo = async () => {
      setIsProcessing(true);
      const data = await generateDemoData();
      // Artificial delay for realism
      setTimeout(() => {
          onDataLoaded(data);
          setIsProcessing(false);
      }, 800);
  };

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Upload Assessment Data</h2>
        <p className="text-gray-500">Import your Excel sheets to generate insights and remedial plans.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-8">
        
        {/* Template Download - Top Action */}
        <div className="flex justify-center">
             <button 
                onClick={downloadTemplate}
                className="flex items-center gap-2 text-sm bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full hover:bg-indigo-100 transition-colors border border-indigo-200"
            >
                <Download size={16} /> 
                Download Excel Template
            </button>
        </div>

        {/* Upload Zone */}
        <div className="relative border-2 border-dashed border-indigo-200 rounded-xl bg-white p-10 text-center hover:bg-indigo-50/30 transition-colors">
          <input 
            type="file" 
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center pointer-events-none">
            <div className="bg-indigo-50 p-4 rounded-full shadow-sm mb-4">
              <Upload className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-indigo-900">Click to upload Excel</h3>
            <p className="text-sm text-indigo-600 mt-1">or drag and drop file here</p>
          </div>
        </div>

        {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-100">
                ⚠️ {error}
            </div>
        )}

        {isProcessing && (
            <div className="flex items-center justify-center space-x-2 text-indigo-600">
                <div className="w-4 h-4 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-4 h-4 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-4 h-4 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Don't have a file?</span>
          </div>
        </div>

        <button 
            onClick={loadDemo}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-4 rounded-xl font-semibold hover:bg-gray-800 transition-transform active:scale-95"
        >
            <Play size={20} className="fill-current" />
            Load Demo Data
        </button>

        {/* Requirements Box */}
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-2">
            <p className="font-semibold text-gray-800 flex items-center gap-2">
                <FileSpreadsheet size={16} /> File Requirements:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-1 text-xs">
                <li>Sheet 1: <code className="bg-gray-200 px-1 rounded">QuestionsMapping</code> (Question No, Skill Code, etc.)</li>
                <li>Sheet 2: <code className="bg-gray-200 px-1 rounded">StudentResults</code> (Student Name, ID, Q1, Q2...)</li>
            </ul>
        </div>
      </div>
    </div>
  );
};

export default UploadView;