/**
 * 数据恢复提示组件
 * 当检测到用户数据异常时显示
 */

import { useState } from 'react';
import { recoverDataFromDatabase } from '~/lib/DataIntegritySystem';

interface DataRecoveryAlertProps {
  onClose: () => void;
  onRecoveryComplete: () => void;
}

export default function DataRecoveryAlert({ onClose, onRecoveryComplete }: DataRecoveryAlertProps) {
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleRecover = async () => {
    setIsRecovering(true);
    setRecoveryStatus('idle');
    
    try {
      const success = await recoverDataFromDatabase();
      
      if (success) {
        setRecoveryStatus('success');
        // 2秒后刷新页面
        setTimeout(() => {
          onRecoveryComplete();
          window.location.reload();
        }, 2000);
      } else {
        setRecoveryStatus('error');
      }
    } catch (error) {
      console.error('数据恢复失败:', error);
      setRecoveryStatus('error');
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 p-8 relative animate-fade-in">
        {/* 图标 */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center">
            <span className="text-4xl">⚠️</span>
          </div>
        </div>

        {/* 标题 */}
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-4">
          检测到数据异常
        </h2>

        {/* 说明 */}
        <div className="mb-6 space-y-3 text-sm text-slate-600">
          <p className="text-center">
            系统检测到您的本地数据可能已丢失，但您的数据仍然保存在云端服务器中。
          </p>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="font-medium text-blue-900 mb-2">💡 可能的原因：</p>
            <ul className="space-y-1 text-blue-700 text-xs">
              <li>• 浏览器缓存被清除</li>
              <li>• 使用了无痕/隐私模式</li>
              <li>• 更换了设备或浏览器</li>
            </ul>
          </div>
          <p className="text-center font-medium text-slate-700">
            点击"恢复数据"可从云端恢复您的所有数据。
          </p>
        </div>

        {/* 恢复状态 */}
        {recoveryStatus === 'success' && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <div className="text-2xl mb-2">✅</div>
            <p className="text-green-900 font-medium">数据恢复成功！</p>
            <p className="text-green-700 text-sm mt-1">正在刷新页面...</p>
          </div>
        )}

        {recoveryStatus === 'error' && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <div className="text-2xl mb-2">❌</div>
            <p className="text-red-900 font-medium">恢复失败</p>
            <p className="text-red-700 text-sm mt-1">请检查网络连接后重试</p>
          </div>
        )}

        {/* 按钮 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isRecovering || recoveryStatus === 'success'}
            className="flex-1 px-6 py-3 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            稍后处理
          </button>
          <button
            onClick={handleRecover}
            disabled={isRecovering || recoveryStatus === 'success'}
            className="flex-1 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isRecovering ? '恢复中...' : '恢复数据'}
          </button>
        </div>

        {/* 帮助提示 */}
        <p className="text-xs text-center text-slate-400 mt-4">
          如果多次恢复失败，请联系客服获取帮助
        </p>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}












