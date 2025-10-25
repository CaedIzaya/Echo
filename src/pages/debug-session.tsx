'use client';

import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function DebugSession() {
  const { data: session, status } = useSession();

  useEffect(() => {
    console.log("DebugSession - Session状态:", { session, status });
  }, [session, status]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Session 诊断</h1>
        
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold text-gray-700">Session 状态:</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm">
              {JSON.stringify({ status, session }, null, 2)}
            </pre>
          </div>
          
          <div>
            <h2 className="font-semibold text-gray-700">测试 useSession():</h2>
            <p className="text-gray-600">
              {status === "loading" && "加载中..."}
              {status === "authenticated" && "✅ 已认证 - SessionProvider 工作正常"}
              {status === "unauthenticated" && "❌ 未认证 - 但 SessionProvider 存在"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}