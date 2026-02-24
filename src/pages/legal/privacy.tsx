import { useRouter } from 'next/router';
import Head from 'next/head';

export default function PrivacyPolicy() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>隐私政策 - Echo</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-teal-50/40 via-cyan-50/30 to-blue-50/40 pb-8">
        {/* 顶部头部 */}
        <div className="bg-white/60 backdrop-blur-2xl border-b border-white/60 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.back()}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100/50 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900">隐私政策</h1>
              <div className="w-10"></div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="bg-white/70 backdrop-blur-2xl rounded-3xl p-8 shadow-lg border border-white/60">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Echo 隐私政策（V1.0）</h2>
              <p className="text-sm text-gray-500">最后更新日期：2026年1月</p>
            </div>

            <div className="prose prose-gray max-w-none space-y-6">
              <div>
                <p className="text-gray-700 leading-relaxed">
                  欢迎使用 Echo。我们深知个人信息对您的重要性，并会尽力保护您的隐私安全。本政策会以“我们实际会收集/存储/使用的数据”为准，向您说明 Echo 在运行过程中会处理哪些信息、为何处理、保存多久，以及您可以如何管理这些信息。
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">一、我们收集与生成的信息（以实际功能为准）</h3>
                <p className="text-gray-700 leading-relaxed mb-3">Echo 主要收集/生成以下信息：</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li><strong>账户信息</strong>：邮箱（用于登录与识别账号）、昵称（可选）、密码的加密摘要（我们不会保存明文密码）。</li>
                  <li><strong>安全信息</strong>：您在“账号安全”里设置的密保问题与答案摘要（答案会做规范化与加盐哈希处理）。</li>
                  <li><strong>会话与认证信息</strong>：用于保持登录状态的会话记录，以及必要的认证 Cookie（由认证系统生成与管理）。</li>
                  <li><strong>专注与成长数据</strong>：专注会话（开始/结束时间、时长、心流评分/指标等）、连续天数、累计专注时长、经验值/等级、心树经验/等级、浇水/施肥次数等。</li>
                  <li><strong>计划与小目标数据</strong>：计划（项目）信息、小目标内容与完成状态、是否为主要计划等。</li>
                  <li><strong>内容与记录</strong>：日小结、周报（以结构化数据形式存储）、分享链接（用于您主动分享时生成的 token 及其有效期）。</li>
                  <li><strong>成就与商店</strong>：已解锁的成就、商店购买记录、主题/徽章等偏好。</li>
                  <li><strong>站内信</strong>：包括欢迎邮件等站内消息。欢迎邮件会以“永久站内信”的形式随账号长期保存（除非您注销账号）。</li>
                  <li><strong>本地缓存（在您的设备上）</strong>：为提升体验，部分状态会在浏览器本地存储（如主题选择、部分 UI 缓存、今日选中的小目标等）。这些数据主要用于更快加载与跨刷新保持状态，登录后关键数据以数据库为准。</li>
                </ul>
                <p className="text-gray-700 leading-relaxed mt-3">
                  我们不会将您的数据出售或出租给第三方。除非为了提供服务所必需（例如托管与数据库基础设施），或法律法规要求，我们不会向第三方披露您的个人信息。
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">二、我们如何使用这些信息</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li><strong>提供核心功能</strong>：创建/管理计划与小目标、记录专注、计算心流与统计、等级与心树成长、成就、商店与主题等。</li>
                  <li><strong>账号与安全</strong>：登录认证、会话管理、密保验证与密码重置。</li>
                  <li><strong>体验与一致性</strong>：跨设备同步关键数据（以数据库为准），并在本地做必要缓存减少闪烁和加载等待。</li>
                  <li><strong>生成内容</strong>：根据您的历史记录生成周报/站内信等内容展示（在应用内呈现）。</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">三、信息的存储、保留期限与保护</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li><strong>存储位置</strong>：您的关键数据会存储在我们的数据库中；本地缓存仅保存在您的设备浏览器中。</li>
                  <li><strong>保留期限（默认）</strong>：除非您主动删除/清除或注销账号，我们会持续保存您的专注与成长数据，以便为您提供长期趋势与跨设备一致性。</li>
                  <li><strong>短期/临时数据</strong>：密码重置 token 等安全类临时数据会设置有效期，过期或使用后会失效。</li>
                  <li><strong>分享链接</strong>：当您主动生成分享链接时，我们会保存 token 及可能的过期时间；过期后链接不可用。</li>
                  <li><strong>站内信</strong>：欢迎邮件会标记为永久站内信，不会被系统定期清理；如您注销账号，则随账号一并删除。</li>
                  <li><strong>安全措施</strong>：我们对密码与密保答案使用加盐哈希；对核心数据访问进行鉴权控制；并采取合理的安全措施降低数据泄露风险。</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">四、您的权利与可控项</h3>
                <p className="text-gray-700 leading-relaxed mb-2">您可以在 Echo 中：</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li><strong>查看与更正</strong>：查看并修改昵称、个性签名等资料信息。</li>
                  <li><strong>退出登录</strong>：在设备上清除登录状态。</li>
                  <li><strong>清理本地缓存</strong>：通过浏览器设置清除本地存储数据（这可能会影响离线体验与部分 UI 记忆）。</li>
                  <li><strong>联系我们</strong>：如需导出或删除账号数据，请联系下方邮箱（我们会在核验身份后处理）。</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">五、未成年人保护</h3>
                <p className="text-gray-700 leading-relaxed">
                  若您未满18岁，请在监护人指导下使用 Echo。我们不会主动收集未成年人信息。
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">六、政策更新</h3>
                <p className="text-gray-700 leading-relaxed">
                  Echo 可能会不时更新本隐私政策。更新后我们会在应用内提示或通知您阅读。
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">七、联系我们</h3>
                <p className="text-gray-700 leading-relaxed mb-2">
                  若您对本政策或个人信息保护有任何疑问，请通过以下方式联系我们：
                </p>
                <p className="text-gray-700 leading-relaxed">
                  📧 邮箱：<a href="mailto:Caedmon_Izaya@outlook.com" className="text-teal-600 hover:text-teal-700 underline">Caedmon_Izaya@outlook.com</a>
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500 text-center">
                  © 2026 Echo Project. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

