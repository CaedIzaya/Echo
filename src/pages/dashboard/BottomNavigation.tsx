import { useRouter } from 'next/router';

interface BottomNavigationProps {
  active: 'home' | 'focus' | 'plans' | 'heart-tree';
}

export default function BottomNavigation({ active }: BottomNavigationProps) {
  const router = useRouter();

  const navItems = [
    { 
      key: 'home', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ), 
      label: '主页', 
      path: '/dashboard' 
    },
    { 
      key: 'focus', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ), 
      label: '专注', 
      path: '/focus' 
    },
    { 
      key: 'plans', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ), 
      label: '计划', 
      path: '/plans' 
    },
    { 
      key: 'heart-tree', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ), 
      label: '心树', 
      path: '/heart-tree' 
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-100 px-4 py-3 shadow-lg shadow-gray-100 z-[9999]">
      <div className="flex justify-around items-center max-w-4xl mx-auto">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => router.push(item.path)}
            className={`flex flex-col items-center px-4 py-2 rounded-2xl transition-all duration-200 ${
              active === item.key 
                ? 'text-teal-500 bg-teal-50 scale-105' 
                : 'text-gray-500 hover:text-teal-500 hover:bg-teal-50/50'
            }`}
          >
            <span className="mb-1">{item.icon}</span>
            <span className="text-xs font-semibold">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}