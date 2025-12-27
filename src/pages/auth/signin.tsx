import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import LoadingOverlay from "~/components/LoadingOverlay";
import { setCurrentUserId, migrateToUserStorage } from "~/lib/userStorage";

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
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [authStatus, setAuthStatus] = useState("未检测");
  const [hasRedirected, setHasRedirected] = useState(false);

  const shouldForceOnboarding = () => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("forceOnboarding") === "true";
  };

  const markOnboardingCompleteSilently = async () => {
    try {
      await fetch("/api/user/complete-onboarding", { method: "POST" });
    } catch (error) {
      console.error("自动更新 onboarding 状态失败:", error);
    }
  };

  // 检查认证状态的替代方法
  const checkAuthStatus = async () => {
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
    const emailParam = router.query.email;
    if (emailParam) {
      let emailStr: string;
      if (Array.isArray(emailParam)) {
        emailStr = emailParam[0] || '';
      } else if (typeof emailParam === 'string') {
        emailStr = emailParam;
      } else {
        return;
      }
      
      if (emailStr && typeof emailStr === 'string' && emailStr.includes('@')) {
        try {
          const decodedEmail = decodeURIComponent(emailStr);
          setFormData(prev => ({ ...prev, email: decodedEmail }));
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', '/auth/signin');
          }
        } catch (error) {
          console.error('解码邮箱参数失败:', error);
        }
      }
    }
  }, [router.query.email]);

  const handlePostLoginRedirect = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const session = await response.json();
      console.log("登录后获取的 session:", session);
      
      // 🔥 设置用户ID，启用数据隔离
      if (session?.user?.id) {
        setCurrentUserId(session.user.id);
        console.log('✅ 登录成功，已设置用户ID:', session.user.id);
        
        // 迁移旧数据到用户隔离存储（首次登录）
        const migrationKeys = ['userPlans', 'todayStats', 'weeklyStats', 'focusSession', 'achievedAchievements'];
        migrateToUserStorage(migrationKeys);
      }
      
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
      router.push("/dashboard");
    }
  };

  const validatePassword = (password: string): string => {
    if (password.length < 8) return "密码至少需要8位字符";
    return "";
  };

  const validateConfirmPassword = (password: string, confirmPassword: string): string => {
    if (!confirmPassword) return "请再次输入密码";
    if (password !== confirmPassword) return "两次输入的密码不一致";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLogin) {
      const pwdError = validatePassword(formData.password);
      const confirmPwdError = validateConfirmPassword(formData.password, formData.confirmPassword);
      setPasswordError(pwdError);
      setConfirmPasswordError(confirmPwdError);
      if (pwdError || confirmPwdError) return;
      if (!agreedToTerms) {
        alert('请先阅读并同意用户协议和隐私政策');
        return;
      }
    }
    
    setIsLoading(true);
    
    if (isLogin) {
      try {
        const result = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });
        
        if (result?.ok) {
          console.log("登录成功，准备跳转...");
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
        alert("登录过程出现异常，请重试");
      }
    } else {
      const { confirmPassword, ...registerData } = formData;
      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(registerData),
        });
        
        const result = await response.json();
        if (response.ok) {
          const loginResult = await signIn("credentials", {
            email: formData.email,
            password: formData.password,
            redirect: false,
          });
          
          if (loginResult?.ok) {
            // 🔥 注册成功后，获取用户ID并设置
            const sessionResponse = await fetch('/api/auth/session');
            const sessionData = await sessionResponse.json();
            if (sessionData?.user?.id) {
              setCurrentUserId(sessionData.user.id);
              console.log('✅ 注册成功，已设置用户ID:', sessionData.user.id);
            }
            
            if (typeof window !== "undefined") {
              sessionStorage.setItem("forceOnboarding", "true");
            }
            router.push("/onboarding");
          } else {
            setIsLogin(true);
          }
        } else {
          alert(result.error || "注册失败，请重试");
        }
      } catch (error) {
        alert("注册过程出现异常，请重试");
      }
    }
    setIsLoading(false);
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

      <div className="relative z-10 w-full max-w-sm md:max-w-md">
        {/* Logo 和品牌区域 */}
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity"></div>
            <div className="relative bg-gradient-to-br from-teal-500 via-teal-400 to-cyan-500 rounded-2xl p-2 shadow-xl shadow-teal-500/30 transform group-hover:scale-105 transition-transform overflow-hidden">
              <img src="/Echo Icon.png" alt="Echo" className="w-full h-full object-cover scale-150" />
            </div>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 bg-clip-text text-transparent mb-2 tracking-tight select-none">
            Echo
          </h1>
          <div className="w-16 h-px bg-gray-300 mx-auto mb-3"></div>
          <p className="text-gray-900 text-base font-medium">开启你的专注之旅</p>
        </div>

        <div className="bg-white/70 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl shadow-black/5 border border-white/60 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {/* 登录/注册切换 - 更精致的设计 */}
          <div className="flex rounded-2xl bg-gray-100/50 p-1 mb-8">
            <button
              onClick={() => {
                setIsLogin(true);
                setPasswordError("");
                setConfirmPasswordError("");
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
                setPasswordError("");
                setConfirmPasswordError("");
                setAgreedToTerms(false);
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
                  if (!isLogin) {
                    const error = validatePassword(e.target.value);
                    setPasswordError(error);
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

            {/* 忘记密码链接 - 仅在登录模式显示 */}
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
      
      {/* 加载遮罩 */}
      {isLoading && <LoadingOverlay message={isLogin ? "登录中..." : "注册中..."} />}
    </div>
  );
}
