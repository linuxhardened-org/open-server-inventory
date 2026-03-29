import { Search, Bell, User, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export const TopBar = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <header className="h-16 border-b border-[#1a1a2e] bg-[#0a0a0f]/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-30">
      <div className="flex-1 max-w-xl relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          placeholder="Search everything..." 
          className="w-full bg-[#111118] border border-[#1a1a2e] rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"
        />
      </div>

      <div className="flex items-center gap-6">
        <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full border-2 border-[#0a0a0f]" />
        </button>
        
        <div className="h-8 w-px bg-[#1a1a2e]" />

        <button className="flex items-center gap-3 hover:bg-white/5 p-1.5 pr-3 rounded-xl transition-all group">
          <div className="w-8 h-8 bg-blue-600/10 rounded-lg flex items-center justify-center border border-blue-600/20 group-hover:bg-blue-600/20">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium">{user?.username || 'Admin User'}</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{user?.role || 'operator'}</p>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
        </button>
      </div>
    </header>
  );
};
