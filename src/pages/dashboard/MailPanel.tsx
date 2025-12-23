import React, { useState } from 'react';
import { Mail, useMailSystem } from '~/lib/MailSystem';

interface MailPanelProps {
  onClose: () => void;
}

export default function MailPanel({ onClose }: MailPanelProps) {
  const { mails, markAsRead } = useMailSystem();
  const [selectedMail, setSelectedMail] = useState<Mail | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const totalPages = Math.ceil(mails.length / itemsPerPage);
  const currentMails = mails.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleMailClick = (mail: Mail) => {
    markAsRead(mail.id);
    setSelectedMail(mail);
  };

  const handleBack = () => {
    setSelectedMail(null);
  };

  // 列表视图
  const renderListView = () => (
    <div className="flex flex-col h-full bg-white">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-teal-400 to-cyan-500 p-6 text-white flex justify-between items-center shrink-0">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span>📬</span>
          <span>收件箱</span>
        </h2>
        <button 
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-90 shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 🔥 新增：历史周报快捷入口 */}
      <div className="p-4 bg-gradient-to-r from-emerald-50 to-cyan-50 border-b border-emerald-100">
        <a
          href="/reports/weekly"
          className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-emerald-200 hover:border-emerald-300 hover:shadow-lg transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white text-xl shadow-lg">
              📊
            </div>
            <div>
              <div className="font-bold text-gray-900 group-hover:text-emerald-600 transition">
                查看周报历史
              </div>
              <div className="text-xs text-gray-500">
                浏览最近4周的专注周报
              </div>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400 group-hover:text-emerald-500 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      {/* 列表内容 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
        {currentMails.map((mail) => (
          <div
            key={mail.id}
            onClick={() => handleMailClick(mail)}
            className={`group relative p-4 rounded-2xl border-2 transition-all cursor-pointer hover:-translate-y-1 hover:shadow-lg active:scale-[0.98] duration-300 ease-out ${
              mail.isRead 
                ? 'bg-white border-gray-100 text-gray-600' 
                : 'bg-white border-teal-200/60 shadow-md shadow-teal-500/5'
            }`}
          >
            {/* 未读红点 */}
            {!mail.isRead && (
              <span className="absolute top-4 right-4 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}

            <div className="flex justify-between items-start mb-2 pr-6">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                mail.isRead 
                  ? 'bg-gray-50 text-gray-500 border-gray-100' 
                  : 'bg-teal-50 text-teal-600 border-teal-100'
              }`}>
                {mail.sender}
              </span>
              <span className="text-xs text-gray-400 font-medium">{mail.date}</span>
            </div>
            
            <h3 className={`font-bold text-lg mb-1 truncate leading-snug ${!mail.isRead ? 'text-gray-900' : 'text-gray-500'}`}>
              {mail.title}
            </h3>
            
            {/* 目前新手欢迎邮件不再包含任何附件，这里先隐藏附件标签 */}
          </div>
        ))}

        {currentMails.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <span className="text-6xl mb-4 opacity-50">🍃</span>
            <p className="text-sm font-medium">还没有收到任何信件</p>
          </div>
        )}
      </div>

      {/* 分页控制 */}
      <div className="p-4 border-t border-gray-100 bg-white flex justify-between items-center shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] z-10">
        <button
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          上一页
        </button>
        <div className="flex items-center gap-1">
           {Array.from({ length: totalPages }).map((_, idx) => (
             <div 
                key={idx} 
                className={`w-2 h-2 rounded-full transition-all ${
                  currentPage === idx + 1 ? 'bg-teal-500 scale-125' : 'bg-gray-200'
                }`} 
             />
           ))}
        </div>
        <button
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="px-4 py-2 rounded-xl text-sm font-bold text-teal-600 hover:bg-teal-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          下一页
        </button>
      </div>
    </div>
  );

  // 详情视图
  const renderDetailView = () => {
    if (!selectedMail) return null;

    return (
      <div className="flex flex-col h-full bg-white">
        {/* 详情头部 */}
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 p-4 flex items-center gap-4 shrink-0 sticky top-0 z-10">
          <button 
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-600 flex items-center justify-center transition-all active:scale-90 border border-gray-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-lg truncate text-gray-900">{selectedMail.title}</h2>
            <div className="flex items-center gap-2 text-xs text-gray-500">
               <span className="font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md">{selectedMail.sender}</span>
               <span>•</span>
               <span>{selectedMail.date}</span>
            </div>
          </div>
        </div>

        {/* 邮件内容 */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="prose prose-teal max-w-none">
            <p className="whitespace-pre-wrap text-gray-700 leading-relaxed text-base tracking-wide">
              {selectedMail.content}
            </p>
          </div>
          {selectedMail.actionUrl && (
            <div className="mt-6">
              <a
                href={selectedMail.actionUrl}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-teal-700 transition active:scale-95"
              >
                {selectedMail.actionLabel ?? '查看详情'}
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </a>
            </div>
          )}
          {/* 新手欢迎邮件当前不提供附件，附件区域暂时移除，避免造成误解 */}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 transition-all">
      <div 
         className="bg-white w-full max-w-lg h-[650px] max-h-[85vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative animate-fade-in-up"
         style={{ animation: 'fadeInUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        <style jsx>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
        {selectedMail ? renderDetailView() : renderListView()}
      </div>
    </div>
  );
}




