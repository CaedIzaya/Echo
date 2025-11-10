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

  const shouldForceOnboarding = () => {
    if (typeof window === "undefined") {
      return false;
    }
    return sessionStorage.getItem("forceOnboarding") === "true";
  };

  const markOnboardingCompleteSilently = async () => {
    try {
      await fetch("/api/user/complete-onboarding", {
        method: "POST",
      });
    } catch (error) {
      console.error("自动更新 onboarding 状态失败:", error);
    }
  };

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
        
        const forceOnboarding = shouldForceOnboarding();
        console.log("是否需要强制进入 onboarding:", forceOnboarding);

        if (forceOnboarding) {
          router.push("/onboarding");
          return;
        }

        if (session.user.hasCompletedOnboarding) {
          router.push("/dashboard");
          return;
        }

        await markOnboardingCompleteSilently();
        router.push("/dashboard");
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
        const forceOnboarding = shouldForceOnboarding();
        console.log("登录后是否需要强制进入 onboarding:", forceOnboarding);

        if (forceOnboarding) {
          router.push("/onboarding");
        } else {
          await markOnboardingCompleteSilently();
          router.push("/dashboard");
        }
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
            if (typeof window !== "undefined") {
              sessionStorage.setItem("forceOnboarding", "true");
            }
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 px-4 py-8">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo 和欢迎区域 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-teal-500 rounded-3xl mb-4 shadow-lg shadow-teal-100">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">数字静默</h1>
          <p className="text-gray-500 text-lg">开启你的专注之旅</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl shadow-teal-100/50 border border-white/20">
          {/* 登录/注册切换 */}
          <div className="flex rounded-2xl bg-teal-50/50 p-1.5 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              disabled={isLoading}
              className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-all duration-200 ${
                isLogin 
                  ? "bg-white text-teal-600 shadow-sm" 
                  : "text-gray-500 hover:text-teal-600"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              登录
            </button>
            <button
              onClick={() => setIsLogin(false)}
              disabled={isLoading}
              className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-all duration-200 ${
                !isLogin 
                  ? "bg-white text-teal-600 shadow-sm" 
                  : "text-gray-500 hover:text-teal-600"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              注册
            </button>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  昵称
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  disabled={isLoading}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3.5 transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="给自己取个昵称"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                邮箱
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                disabled={isLoading}
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3.5 transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                密码
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                disabled={isLoading}
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3.5 transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="至少6位字符"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-teal-500 px-4 py-4 text-white font-semibold hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all duration-200 shadow-lg shadow-teal-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
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
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-3 text-gray-400">或</span>
            </div>
          </div>

          {/* GitHub 登录 */}
          <button
            onClick={handleGitHubSignIn}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-gray-900 px-4 py-4 text-white font-semibold hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
            </svg>
            <span>使用 GitHub {isLogin ? "登录" : "注册"}</span>
          </button>
        </div>

        {/* 隐藏调试链接 */}
        <div className="mt-6 pt-4 text-center">
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-xs text-gray-400 hover:text-teal-600 transition-colors"
            >
              仪表盘
            </button>
            <button
              onClick={checkAuthStatus}
              className="text-xs text-gray-400 hover:text-teal-600 transition-colors"
            >
              刷新状态
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}