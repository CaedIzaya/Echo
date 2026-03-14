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
        
        if (!session.user.hasCompletedOnboarding) {
          await markOnboardingCompleteSilently();
        }
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
        
        // 🧹 自动清理全局 localStorage key（防止数据污染）
        if (typeof window !== 'undefined') {
          const globalKeysToClean = [
            'userExp', 'userExpSynced', 'userExpSyncedAt',
            'heartTreeExpState', 'heartTreeExpSynced',
            'heartTreeNameV1', 'heartTreeNameSynced',
            'userPlans', 'userPlansSynced', 'projectsSyncedAt',
            'todayStats', 'weeklyStats', 'dashboardStats',
            'totalFocusMinutes', 'focusSession', 'flowMetrics',
            'dashboardDataCache', 'dashboardDataSynced', 'dashboardDataSyncedAt',
            'dataRecovered', 'dataSyncedAt', 'dataRecoveredAt'
          ];
          
          let cleaned = 0;
          globalKeysToClean.forEach(key => {
            if (localStorage.getItem(key)) {
              localStorage.removeItem(key);
              cleaned++;
            }
          });
          
          if (cleaned > 0) {
            console.log(`🧹 清理了 ${cleaned} 个全局 localStorage key`);
          }
        }
      }
      
      if (!session?.user?.hasCompletedOnboarding) {
        await markOnboardingCompleteSilently();
      }
      router.push("/dashboard");
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
            const sessionResponse = await fetch('/api/auth/session');
            const sessionData = await sessionResponse.json();
            if (sessionData?.user?.id) {
              setCurrentUserId(sessionData.user.id);
            }
            
            await markOnboardingCompleteSilently();
            router.push("/dashboard");
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
    <div className="flex min-h-screen items-center justify-center relative overflow-hidden bg-[#f8fffe] px-4 py-8">
      {/* 浮动光晕背景 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="signin-orb signin-orb-1" />
        <div className="signin-orb signin-orb-2" />
        <div className="signin-orb signin-orb-3" />
        <div className="signin-orb signin-orb-4" />
      </div>

      {/* 柔光噪点纹理 */}
      <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />

      <div className="relative z-10 w-full max-w-[400px]">
        {/* Logo */}
        <div className="text-center mb-10 signin-enter" style={{ animationDelay: '0.05s' }}>
          <div className="inline-flex items-center justify-center w-[72px] h-[72px] mb-5 relative group">
            <div className="absolute inset-[-6px] bg-gradient-to-br from-teal-300/50 to-cyan-300/50 rounded-[22px] blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
            <div className="relative bg-gradient-to-br from-teal-500 to-cyan-500 rounded-[18px] p-2 shadow-lg shadow-teal-500/20 transition-transform duration-500 ease-out group-hover:scale-105 overflow-hidden">
              <img src="/Echo Icon.png" alt="Echo" className="w-full h-full object-cover scale-150" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-500 bg-clip-text text-transparent tracking-tight select-none">
            Echo
          </h1>
          <p className="text-gray-400 text-sm font-normal mt-2 tracking-wide">开启你的专注之旅</p>
        </div>

        {/* 玻璃卡片 */}
        <div className="signin-card signin-enter" style={{ animationDelay: '0.15s' }}>
          {/* 登录/注册切换 — 滑块式 */}
          <div className="relative flex rounded-2xl bg-black/[0.03] p-1 mb-7">
            <div
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-white shadow-sm transition-transform duration-500 ease-[cubic-bezier(.4,0,.2,1)]"
              style={{ transform: isLogin ? 'translateX(4px)' : 'translateX(calc(100% + 4px))' }}
            />
            <button
              onClick={() => { setIsLogin(true); setPasswordError(""); setConfirmPasswordError(""); setFormData({...formData, confirmPassword: ""}); }}
              disabled={isLoading}
              className={`relative z-10 flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors duration-300 ${isLogin ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              登录
            </button>
            <button
              onClick={() => { setIsLogin(false); setPasswordError(""); setConfirmPasswordError(""); setAgreedToTerms(false); setFormData({...formData, confirmPassword: ""}); }}
              disabled={isLoading}
              className={`relative z-10 flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors duration-300 ${!isLogin ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              注册
            </button>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="signin-field-enter">
                <label className="block text-xs font-medium text-gray-500 mb-1.5 ml-1">昵称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  disabled={isLoading}
                  className="signin-input"
                  placeholder="给自己取个昵称"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 ml-1">邮箱</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                disabled={isLoading}
                className="signin-input"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 ml-1">密码</label>
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
                onBlur={() => { if (!isLogin) setPasswordError(validatePassword(formData.password)); }}
                disabled={isLoading}
                className={`signin-input ${passwordError ? '!border-red-300 focus:!border-red-400 focus:!ring-red-500/20' : ''}`}
                placeholder={isLogin ? "请输入密码" : "至少8位字符"}
                required
                minLength={isLogin ? undefined : 8}
              />
              {passwordError && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1 ml-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {passwordError}
                </p>
              )}
            </div>

            {isLogin && (
              <div className="text-right -mt-1">
                <button type="button" onClick={() => router.push('/auth/forgot-password')} className="text-xs text-teal-500 hover:text-teal-600 transition-colors">
                  忘记密码？
                </button>
              </div>
            )}

            {!isLogin && (
              <div className="signin-field-enter">
                <label className="block text-xs font-medium text-gray-500 mb-1.5 ml-1">确认密码</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => { setFormData({...formData, confirmPassword: e.target.value}); setConfirmPasswordError(validateConfirmPassword(formData.password, e.target.value)); }}
                  onBlur={() => setConfirmPasswordError(validateConfirmPassword(formData.password, formData.confirmPassword))}
                  disabled={isLoading}
                  className={`signin-input ${confirmPasswordError ? '!border-red-300 focus:!border-red-400 focus:!ring-red-500/20' : ''}`}
                  placeholder="请再次输入密码"
                  required
                />
                {confirmPasswordError && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1 ml-1">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {confirmPasswordError}
                  </p>
                )}
              </div>
            )}

            {!isLogin && (
              <div className="flex items-start gap-3 p-3.5 bg-white/60 rounded-xl border border-black/[0.04] signin-field-enter">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500 focus:ring-2 cursor-pointer"
                />
                <label htmlFor="agreeTerms" className="flex-1 text-xs text-gray-500 cursor-pointer leading-relaxed">
                  我已阅读并同意
                  <button type="button" onClick={(e) => { e.preventDefault(); window.open('/legal/terms', '_blank'); }} className="text-teal-500 hover:text-teal-600 underline mx-0.5">用户协议</button>
                  和
                  <button type="button" onClick={(e) => { e.preventDefault(); window.open('/legal/privacy', '_blank'); }} className="text-teal-500 hover:text-teal-600 underline mx-0.5">隐私政策</button>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || (!isLogin && !agreedToTerms)}
              className="signin-btn group relative w-full rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 px-4 py-3.5 text-white font-semibold focus:outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center text-sm">
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    处理中...
                  </>
                ) : (
                  <>
                    {isLogin ? '登录' : '注册'}
                    <svg className="w-4 h-4 ml-1.5 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>
          </form>

          <div className="mt-5 text-center">
            <button type="button" onClick={() => router.push('/')} className="text-xs text-gray-400 hover:text-gray-500 transition-colors">
              返回到欢迎页
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* ===== 浮动光晕 ===== */
        .signin-orb {
          position: absolute;
          border-radius: 9999px;
          filter: blur(80px);
          will-change: transform;
        }
        .signin-orb-1 {
          width: 420px; height: 420px;
          background: radial-gradient(circle, rgba(94,234,212,0.25) 0%, transparent 70%);
          top: -10%; left: -8%;
          animation: orb-drift-1 18s ease-in-out infinite;
        }
        .signin-orb-2 {
          width: 350px; height: 350px;
          background: radial-gradient(circle, rgba(103,232,249,0.20) 0%, transparent 70%);
          bottom: -5%; right: -10%;
          animation: orb-drift-2 22s ease-in-out infinite;
        }
        .signin-orb-3 {
          width: 260px; height: 260px;
          background: radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 70%);
          top: 50%; left: 60%;
          animation: orb-drift-3 20s ease-in-out infinite;
        }
        .signin-orb-4 {
          width: 200px; height: 200px;
          background: radial-gradient(circle, rgba(52,211,153,0.15) 0%, transparent 70%);
          top: 20%; right: 15%;
          animation: orb-drift-4 16s ease-in-out infinite;
        }

        @keyframes orb-drift-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, 30px) scale(1.08); }
          66% { transform: translate(-20px, 50px) scale(0.95); }
        }
        @keyframes orb-drift-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, -40px) scale(1.05); }
          66% { transform: translate(25px, -20px) scale(0.92); }
        }
        @keyframes orb-drift-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-35px, 25px) scale(1.1); }
        }
        @keyframes orb-drift-4 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, -30px); }
        }

        /* ===== 弹性入场 ===== */
        .signin-enter {
          opacity: 0;
          transform: translateY(24px) scale(0.97);
          animation: signin-spring-in 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes signin-spring-in {
          0% { opacity: 0; transform: translateY(24px) scale(0.97); }
          60% { opacity: 1; transform: translateY(-4px) scale(1.01); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* ===== 注册字段入场 ===== */
        .signin-field-enter {
          animation: field-slide-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes field-slide-in {
          0% { opacity: 0; transform: translateY(12px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* ===== 玻璃卡片 ===== */
        .signin-card {
          background: rgba(255, 255, 255, 0.55);
          backdrop-filter: blur(40px) saturate(1.4);
          -webkit-backdrop-filter: blur(40px) saturate(1.4);
          border-radius: 28px;
          padding: 32px;
          border: 1px solid rgba(255, 255, 255, 0.7);
          box-shadow:
            0 0 0 1px rgba(0,0,0,0.02),
            0 4px 24px -4px rgba(0,0,0,0.06),
            0 12px 48px -8px rgba(0,0,0,0.04),
            inset 0 1px 0 rgba(255,255,255,0.8);
        }

        /* ===== 输入框 ===== */
        :global(.signin-input) {
          width: 100%;
          border-radius: 14px;
          border: 1.5px solid rgba(0,0,0,0.06);
          background: rgba(255,255,255,0.5);
          backdrop-filter: blur(8px);
          padding: 12px 16px;
          font-size: 14px;
          color: #1f2937;
          outline: none;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        :global(.signin-input::placeholder) {
          color: #c4c9d0;
        }
        :global(.signin-input:focus) {
          border-color: rgba(20,184,166,0.4);
          background: rgba(255,255,255,0.8);
          box-shadow: 0 0 0 4px rgba(20,184,166,0.08), 0 2px 12px -2px rgba(20,184,166,0.10);
          transform: scale(1.01);
        }
        :global(.signin-input:disabled) {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* ===== 提交按钮 ===== */
        .signin-btn {
          box-shadow: 0 4px 20px -4px rgba(20,184,166,0.35), 0 2px 8px -2px rgba(20,184,166,0.15);
          transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .signin-btn:not(:disabled):hover {
          transform: translateY(-1px) scale(1.02);
          box-shadow: 0 8px 28px -4px rgba(20,184,166,0.4), 0 4px 12px -2px rgba(20,184,166,0.2);
        }
        .signin-btn:not(:disabled):active {
          transform: translateY(0) scale(0.98);
          transition-duration: 0.1s;
        }
      `}</style>

      {isLoading && <LoadingOverlay message={isLogin ? "登录中..." : "注册中..."} />}
    </div>
  );
}
