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
    confirmPassword: "",
    name: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState("未检测");
  const [hasRedirected, setHasRedirected] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

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

  // 检查 URL 参数中的邮箱并填充
  useEffect(() => {
    const emailFromUrl = router.query.email as string;
    if (emailFromUrl) {
      setFormData(prev => ({ ...prev, email: decodeURIComponent(emailFromUrl) }));
      // 清除 URL 参数，避免刷新后重复填充
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/auth/signin');
      }
    }
  }, [router.query.email]);

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

  // 验证密码
  const validatePassword = (password: string): string => {
    if (password.length < 8) {
      return "密码至少需要8位字符";
    }
    return "";
  };

  // 验证确认密码
  const validateConfirmPassword = (password: string, confirmPassword: string): string => {
    if (!confirmPassword) {
      return "请再次输入密码";
    }
    if (password !== confirmPassword) {
      return "两次输入的密码不一致";
    }
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 如果是注册模式，先验证密码和条款同意
    if (!isLogin) {
      const pwdError = validatePassword(formData.password);
      const confirmPwdError = validateConfirmPassword(formData.password, formData.confirmPassword);
      
      setPasswordError(pwdError);
      setConfirmPasswordError(confirmPwdError);
      
      if (pwdError || confirmPwdError) {
        return; // 验证失败，不提交
      }

      // 检查是否同意条款
      if (!agreedToTerms) {
        alert('请先阅读并同意用户协议和隐私政策');
        return;
      }
    }
    
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
      
      // 只发送必要的字段到后端
      const { confirmPassword, ...registerData } = formData;
      
      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(registerData),
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
    <div className="flex min-h-screen items-center justify-center relative overflow-hidden bg-gradient-to-br from-teal-50/40 via-cyan-50/30 to-blue-50/40 px-4 py-8">
      {/* 波浪流线背景 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg className="absolute bottom-0 left-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="signinWaveGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#5eead4" stopOpacity="0.15" />
              <stop offset="50%" stopColor="#2dd4bf" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="signinWaveGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.12" />
              <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.12" />
            </linearGradient>
            <linearGradient id="signinWaveGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          
          {/* 第一层波浪 */}
          <g className="animate-signin-wave-1">
            <path
              d="M-200,450 Q100,400 400,450 T1000,450 T1600,450 L1600,800 L-200,800 Z"
              fill="url(#signinWaveGradient1)"
            />
          </g>
          
          {/* 第二层波浪 */}
          <g className="animate-signin-wave-2">
            <path
              d="M-200,550 Q100,500 400,550 T1000,550 T1600,550 L1600,800 L-200,800 Z"
              fill="url(#signinWaveGradient2)"
            />
          </g>
          
          {/* 第三层波浪 */}
          <g className="animate-signin-wave-3">
            <path
              d="M-200,650 Q100,600 400,650 T1000,650 T1600,650 L1600,800 L-200,800 Z"
              fill="url(#signinWaveGradient3)"
            />
          </g>
        </svg>
        
        {/* 顶部流动光效 */}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-teal-100/20 via-cyan-100/15 to-transparent"></div>
      </div>

      {/* 网格背景 - 更淡 */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:24px_24px] opacity-20"></div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo 和品牌区域 */}
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity"></div>
            <div className="relative bg-gradient-to-br from-teal-500 via-teal-400 to-cyan-500 rounded-2xl p-2 shadow-xl shadow-teal-500/30 transform group-hover:scale-105 transition-transform overflow-hidden">
              <img src="/Echo Icon.png" alt="Echo" className="w-full h-full object-cover scale-150" />
            </div>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2 tracking-tight">Echo</h1>
          <p className="text-gray-600 text-base font-medium">开启你的专注之旅</p>
        </div>

        <div className="bg-white/70 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl shadow-black/5 border border-white/60 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {/* 登录/注册切换 - 更精致的设计 */}
          <div className="flex rounded-2xl bg-gray-100/50 p-1 mb-8">
            <button
              onClick={() => {
                setIsLogin(true);
                // 切换时清除错误信息
                setPasswordError("");
                setConfirmPasswordError("");
                // 清除确认密码字段
                setFormData({...formData, confirmPassword: ""});
              }}
              disabled={isLoading}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-300 ${
                isLogin 
                  ? "bg-white text-gray-900 shadow-sm" 
                  : "text-gray-500 hover:text-gray-700"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              登录
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                // 切换时清除错误信息和状态
                setPasswordError("");
                setConfirmPasswordError("");
                setAgreedToTerms(false);
                // 清除确认密码字段
                setFormData({...formData, confirmPassword: ""});
              }}
              disabled={isLoading}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-300 ${
                !isLogin 
                  ? "bg-white text-gray-900 shadow-sm" 
                  : "text-gray-500 hover:text-gray-700"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              注册
            </button>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  昵称
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  disabled={isLoading}
                  className="w-full rounded-xl border border-gray-200 bg-white/50 backdrop-blur-sm px-4 py-3 transition-all duration-200 focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-gray-400"
                  placeholder="给自己取个昵称"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                邮箱
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                disabled={isLoading}
                className="w-full rounded-xl border border-gray-200 bg-white/50 backdrop-blur-sm px-4 py-3 transition-all duration-200 focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-gray-400"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => {
                  setFormData({...formData, password: e.target.value});
                  // 实时验证密码
                  if (!isLogin) {
                    const error = validatePassword(e.target.value);
                    setPasswordError(error);
                    // 如果确认密码已输入，也验证确认密码
                    if (formData.confirmPassword) {
                      setConfirmPasswordError(validateConfirmPassword(e.target.value, formData.confirmPassword));
                    }
                  }
                }}
                onBlur={() => {
                  if (!isLogin) {
                    setPasswordError(validatePassword(formData.password));
                  }
                }}
                disabled={isLoading}
                className={`w-full rounded-xl border bg-white/50 backdrop-blur-sm px-4 py-3 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-gray-400 ${
                  passwordError ? "border-red-300 focus:border-red-400 focus:ring-red-500/20" : "border-gray-200 focus:border-teal-400"
                }`}
                placeholder={isLogin ? "请输入密码" : "至少8位字符"}
                required
                minLength={isLogin ? undefined : 8}
              />
              {passwordError && (
                <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {passwordError}
                </p>
              )}
            </div>

            {/* 忘记密码链接 - 仅在登录模式显示，位于密码框和登录按钮之间 */}
            {isLogin && (
              <div className="text-right -mt-2">
                <button
                  type="button"
                  onClick={() => router.push('/auth/forgot-password')}
                  className="text-sm text-teal-600 hover:text-teal-700 transition-colors"
                >
                  忘记密码？
                </button>
              </div>
            )}

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  确认密码
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData({...formData, confirmPassword: e.target.value});
                    // 实时验证确认密码
                    setConfirmPasswordError(validateConfirmPassword(formData.password, e.target.value));
                  }}
                  onBlur={() => {
                    setConfirmPasswordError(validateConfirmPassword(formData.password, formData.confirmPassword));
                  }}
                  disabled={isLoading}
                  className={`w-full rounded-xl border bg-white/50 backdrop-blur-sm px-4 py-3 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-gray-400 ${
                    confirmPasswordError ? "border-red-300 focus:border-red-400 focus:ring-red-500/20" : "border-gray-200 focus:border-teal-400"
                  }`}
                  placeholder="请再次输入密码"
                  required
                />
                {confirmPasswordError && (
                  <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {confirmPasswordError}
                  </p>
                )}
              </div>
            )}

            {/* 同意条款 - 仅在注册模式显示 */}
            {!isLogin && (
              <div className="flex items-start gap-3 p-4 bg-gray-50/50 rounded-xl border border-gray-200">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500 focus:ring-2 cursor-pointer"
                />
                <label htmlFor="agreeTerms" className="flex-1 text-sm text-gray-700 cursor-pointer">
                  我已阅读并同意
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      window.open('/legal/terms', '_blank');
                    }}
                    className="text-teal-600 hover:text-teal-700 underline mx-1"
                  >
                    用户协议
                  </button>
                  和
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      window.open('/legal/privacy', '_blank');
                    }}
                    className="text-teal-600 hover:text-teal-700 underline mx-1"
                  >
                    隐私政策
                  </button>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || (!isLogin && !agreedToTerms)}
              className="group relative w-full rounded-xl bg-gradient-to-r from-teal-500 via-teal-500 to-cyan-500 px-4 py-3.5 text-white font-semibold hover:from-teal-600 hover:via-teal-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all duration-300 shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.01] overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center">
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    处理中...
                  </>
                ) : (
                  <>
                    {isLogin ? "登录" : "注册"}
                    <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </span>
              {/* 按钮光效 */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </button>
          </form>

          {/* 分隔线 */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200/60" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white/70 px-3 text-gray-400 text-xs">或</span>
            </div>
          </div>

          {/* GitHub 登录 */}
          <button
            onClick={handleGitHubSignIn}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white/50 backdrop-blur-sm px-4 py-3.5 text-gray-700 font-semibold hover:bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500/20 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.01]"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
            </svg>
            <span>使用 GitHub {isLogin ? "登录" : "注册"}</span>
          </button>

          {/* 返回到欢迎页 */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              返回到欢迎页
            </button>
          </div>
        </div>
      </div>

      {/* CSS动画 */}
      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
        
        @keyframes signin-wave-flow {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(200px);
          }
        }
        
        .animate-signin-wave-1 {
          animation: signin-wave-flow 15s linear infinite;
        }
        
        .animate-signin-wave-2 {
          animation: signin-wave-flow 20s linear infinite;
          animation-direction: reverse;
        }
        
        .animate-signin-wave-3 {
          animation: signin-wave-flow 25s linear infinite;
        }
      `}</style>
    </div>
  );
}