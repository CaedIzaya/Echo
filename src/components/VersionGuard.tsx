/**
 * 版本守卫组件
 * 
 * 功能：
 * 1. 检测应用版本变化
 * 2. 自动清理过期的 localStorage
 * 3. 修复损坏的数据
 */

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { checkNeedsCleanup, cleanupLocalStorage, getVersionInfo } from '~/lib/versionManager';

export function VersionGuard({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [isChecking, setIsChecking] = useState(true);
  const [showMessage, setShowMessage] = useState(false);
  const [cleanupInfo, setCleanupInfo] = useState<string>('');

  useEffect(() => {
    // 只在客户端执行
    if (typeof window === 'undefined') {
      setIsChecking(false);
      return;
    }

    console.log('[VersionGuard] 🔍 检查应用版本...');
    
    const versionInfo = getVersionInfo();
    console.log('[VersionGuard] 版本信息:', versionInfo);

    const { needsCleanup, reason } = checkNeedsCleanup();
    
    if (needsCleanup) {
      console.warn('[VersionGuard] ⚠️ 需要清理:', reason);
      
      // 延迟一点执行清理，避免阻塞首屏渲染
      setTimeout(() => {
        const result = cleanupLocalStorage(session?.user?.id);
        
        if (result.clearedKeys.length > 0) {
          console.log('[VersionGuard] ✅ 清理完成:', result.clearedKeys.length, '个键');
          
          // 显示提示信息
          setCleanupInfo(`检测到版本更新，已清理缓存 (${result.reason})`);
          setShowMessage(true);
          
          // 5秒后自动隐藏提示
          setTimeout(() => {
            setShowMessage(false);
          }, 5000);
        }
        
        setIsChecking(false);
      }, 100);
    } else {
      console.log('[VersionGuard] ✅ 版本检查通过:', reason);
      setIsChecking(false);
    }
  }, [session?.user?.id]);

  // 加载中状态（很短暂，通常不可见）
  if (isChecking) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      
      {/* 清理提示（可选，不阻塞UI） */}
      {showMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: '#4CAF50',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            zIndex: 9999,
            fontSize: '14px',
            maxWidth: '300px',
          }}
        >
          ✅ {cleanupInfo}
        </div>
      )}
    </>
  );
}



