import React, { useState } from 'react';
import { User, GraduationCap, BookOpen, ChevronRight } from 'lucide-react';
import { TeacherProfile } from '../types';

interface OnboardingViewProps {
  onComplete: (profile: TeacherProfile) => void;
}

const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [subject, setSubject] = useState<'Math' | 'English' | 'Science' | 'General'>('Math');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && gradeLevel) {
      onComplete({ name, gradeLevel, subject });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
            <GraduationCap className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to RemedialAI</h1>
          <p className="text-gray-500 mt-2">Let's personalize your planning experience.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Teacher Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                required
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="e.g. Ms. Anderson"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Grade Level</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <GraduationCap className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                >
                  <option value="">Select</option>
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={(i + 1).toString()}>{i + 1}</option>
                  ))}
                  <option value="K">K</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Subject</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <BookOpen className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value as any)}
                >
                  <option value="Math">Math</option>
                  <option value="English">English</option>
                  <option value="Science">Science</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl transition-all transform active:scale-95 shadow-md hover:shadow-lg"
            >
              Start Planning <ChevronRight size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OnboardingView;