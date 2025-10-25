'use client';

import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function DebugApp() {
  const { data: session, status } = useSession();

  useEffect(() => {
    console.log("DebugApp - useSession 状态:", { session, status });
  }, [session, status]);

  if (status === "loading") {
    return <div>加载中...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>_app.tsx 诊断页面</h1>
      <div style={{ margin: '20px 0', padding: '10px', background: status === "authenticated" ? '#d4edda' : '#f8d7da' }}>
        <h2>useSession() 状态: {status}</h2>
        <p>Session: {session ? "有数据" : "无数据"}</p>
        {session && (
          <pre>{JSON.stringify(session, null, 2)}</pre>
        )}
      </div>
      
      <div style={{ margin: '20px 0', padding: '10px', background: '#fff3cd' }}>
        <h2>诊断结果:</h2>
        <p>
          {status === "authenticated" 
            ? "✅ _app.tsx 和 SessionProvider 工作正常！" 
            : status === "unauthenticated" 
            ? "ℹ️ 未认证，但 SessionProvider 存在"
            : "❌ SessionProvider 可能未正确配置"}
        </p>
      </div>
    </div>
  );
}