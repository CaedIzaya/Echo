'use client';

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function SignIn() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState("未检测");
  const [hasRedirected, setHasRedirected] = useState(false);

  // 检查认证状态的替代方法
  const checkAuthStatus = async () => {
    // 防止重复跳转
    if (hasRedirected) {
      console.log("已经跳转过，跳过检查");
      return;
    }

    try {
      const response = await fetch('/api/auth/session');
      const session = await response.json();
      
      if (session?.user) {
        setAuthStatus(`已登录: ${session.user.email}`);
        console.log("检测到已登录用户:", session.user);
        
        // 标记已跳转，防止重复跳转
        setHasRedirected(true);
        
        // 如果已登录，自动跳转
        if (session.user.hasCompletedOnboarding) {
          router.push("/dashboard");
        } else {
          router.push("/onboarding");
        }
      } else {
        setAuthStatus("未登录");
      }
    } catch (error) {
      console.error("检查认证状态失败:", error);
      setAuthStatus("检查失败");
    }
  };

  // 页面加载时检查登录状态
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const handlePostLoginRedirect = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const session = await response.json();
      console.log("登录后获取的 session:", session);
      
      if (session?.user?.hasCompletedOnboarding) {
        console.log("用户已完成 onboarding，跳转到仪表盘");
        router.push("/dashboard");
      } else {
        console.log("用户未完成 onboarding，跳转到引导页");
        router.push("/onboarding");
      }
    } catch (error) {
      console.error("跳转逻辑出错:", error);
      // 备用方案
      router.push("/dashboard");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (isLogin) {
      // 登录逻辑
      console.log("开始登录:", formData.email);
      
      try {
        const result = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });
        
        console.log("登录 API 响应:", result);
        
        if (result?.ok) {
          console.log("登录成功，准备跳转...");
          
          // 等待 session 更新
          setTimeout(async () => {
            await handlePostLoginRedirect();
          }, 1000);
          
        } else {
          let errorMessage = "登录失败，请检查邮箱和密码";
          if (result?.error) {
            errorMessage += ` (${result.error})`;
          }
          alert(errorMessage);
        }
      } catch (error) {
        console.error("登录过程出错:", error);
        alert("登录过程出现异常，请重试");
      }
    } else {
      // 注册逻辑
      console.log("开始注册:", formData);
      
      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });
        
        const result = await response.json();
        console.log("注册 API 响应:", result);
        
        if (response.ok) {
          // 注册成功后自动登录
          const loginResult = await signIn("credentials", {
            email: formData.email,
            password: formData.password,
            redirect: false,
          });
          
          if (loginResult?.ok) {
            console.log("注册后自动登录成功");
            // 新注册用户直接进入 onboarding
            router.push("/onboarding");
          } else {
            alert("注册成功，但自动登录失败，请手动登录");
            setIsLogin(true); // 切换到登录标签
          }
        } else {
          alert(result.error || "注册失败，请重试");
        }
      } catch (error) {
        console.error("注册过程出错:", error);
        alert("注册过程出现异常，请重试");
      }
    }
    
    setIsLoading(false);
  };

  const handleGitHubSignIn = async () => {
    setIsLoading(true);
    
    try {
      // GitHub 登录直接跳转，由 NextAuth 处理回调
      await signIn("github", { 
        callbackUrl: "/onboarding"
      });
    } catch (error) {
      console.error("GitHub 登录出错:", error);
      alert("GitHub 登录失败，请重试");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-100">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl">
        {/* 头部 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">数字静默</h1>
          <p className="mt-2 text-gray-600">开启你的专注之旅</p>
          
          {/* 认证状态显示 */}
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
            <p>认证状态: {authStatus}</p>
          </div>
        </div>

        {/* 登录/注册切换 */}
        <div className="flex rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setIsLogin(true)}
            disabled={isLoading}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              isLogin 
                ? "bg-white shadow-sm text-gray-900" 
                : "text-gray-500 hover:text-gray-700"
            } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            登录
          </button>
          <button
            onClick={() => setIsLogin(false)}
            disabled={isLoading}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              !isLogin 
                ? "bg-white shadow-sm text-gray-900" 
                : "text-gray-500 hover:text-gray-700"
            } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            注册
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                昵称
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                disabled={isLoading}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="请输入昵称"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              邮箱
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              disabled={isLoading}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="example@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              密码
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              disabled={isLoading}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="请输入密码"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                处理中...
              </span>
            ) : (
              isLogin ? "登录" : "注册"
            )}
          </button>
        </form>

        {/* 分隔线 */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">或</span>
          </div>
        </div>

        {/* GitHub 登录 */}
        <button
          onClick={handleGitHubSignIn}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-3 rounded-lg bg-gray-800 px-4 py-3 text-white font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
          </svg>
          <span>使用 GitHub {isLogin ? "登录" : "注册"}</span>
        </button>

        {/* 调试链接 */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center mb-2">快捷链接:</p>
          <div className="flex justify-center space-x-2">
            <button
              onClick={() => router.push("/debug-session")}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              检查 Session
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              简化仪表盘
            </button>
            <button
              onClick={() => router.push("/onboarding")}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              直接引导
            </button>
            <button
              onClick={checkAuthStatus}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              刷新状态
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}