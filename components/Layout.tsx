import React from 'react';
import { LayoutDashboard, Upload, Users, BookOpen, FileText, Menu, X, User } from 'lucide-react';
import { TeacherProfile } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onChangeView: (view: string) => void;
  hasData: boolean;
  teacherProfile: TeacherProfile | null;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onChangeView, hasData, teacherProfile }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const navItems = [
    { id: 'upload', label: 'Upload Data', icon: Upload, requireData: false },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, requireData: true },
    { id: 'class-summary', label: 'Class Summary', icon: Users, requireData: true },
    { id: 'planner', label: 'Remedial Planner', icon: BookOpen, requireData: true },
    { id: 'reports', label: 'Parent Reports', icon: FileText, requireData: true },
  ];

  const handleNav = (id: string) => {
    onChangeView(id);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-indigo-600 flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            RemedialAI
          </h1>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {/* Teacher Profile Card */}
        {teacherProfile && (
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
                        <User size={18} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-800">{teacherProfile.name}</p>
                        <p className="text-xs text-gray-500">Grade {teacherProfile.gradeLevel} • {teacherProfile.subject}</p>
                    </div>
                </div>
            </div>
        )}

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isDisabled = item.requireData && !hasData;
            return (
              <button
                key={item.id}
                onClick={() => !isDisabled && handleNav(item.id)}
                disabled={isDisabled}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                  ${currentView === item.id 
                    ? 'bg-indigo-50 text-indigo-700' 
                    : isDisabled 
                      ? 'text-gray-300 cursor-not-allowed' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            );
          })}
        </nav>
        
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-100">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-xs text-blue-800 font-semibold">Ready for Assessment?</p>
            <p className="text-xs text-blue-600 mt-1">Upload your Excel sheets to unlock AI features.</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-6 lg:hidden">
          <button onClick={() => setIsSidebarOpen(true)} className="text-gray-500 hover:text-gray-700">
            <Menu size={24} />
          </button>
          <span className="ml-4 font-semibold text-gray-800">
             {navItems.find(n => n.id === currentView)?.label}
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;