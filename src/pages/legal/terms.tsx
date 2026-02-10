import { useRouter } from 'next/router';
import Head from 'next/head';

export default function TermsOfService() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>用户协议 - Echo</title>
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
              <h1 className="text-xl font-bold text-gray-900">用户协议</h1>
              <div className="w-10"></div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="bg-white/70 backdrop-blur-2xl rounded-3xl p-8 shadow-lg border border-white/60">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Echo 用户协议（V1.0）</h2>
              <p className="text-sm text-gray-500">最后更新日期：2026年1月</p>
            </div>

            <div className="prose prose-gray max-w-none space-y-6">
              <div>
                <p className="text-gray-700 leading-relaxed">
                  欢迎使用 Echo！
                </p>
                <p className="text-gray-700 leading-relaxed mt-2">
                  本协议是您与 Echo（以下简称“我们”）之间关于使用本产品及服务的法律协议。在使用 Echo 前，请您仔细阅读。您使用或继续使用服务，即表示您已理解并同意本协议。
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">一、服务说明</h3>
                <p className="text-gray-700 leading-relaxed">
                  Echo 是一个帮助用户管理注意力、进行自我觉察与成长的工具类应用。我们提供计划与里程碑管理、专注计时、心流与统计、成长系统（等级/心树/成就/商店）、站内信与周报等功能。您在使用 Echo 的过程中，应遵守相关法律法规及本协议条款。
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">二、账户注册与安全</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                  <li>您需要注册 Echo 账户方可使用完整功能；</li>
                  <li>注册信息应真实、准确、完整；</li>
                  <li>您有责任保管好账户和密码，如遗失可通过密保问题或其他方式找回；</li>
                  <li>若发现账户异常，请及时联系我们。</li>
                </ol>
                <p className="text-gray-700 leading-relaxed mt-3">
                  为保障安全，我们会记录必要的会话与认证信息。您可以在“个人中心 → 会话管理”中查看并让其他设备下线。
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">三、用户行为规范</h3>
                <p className="text-gray-700 leading-relaxed mb-2">您同意不从事以下行为：</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>利用 Echo 进行任何违法活动；</li>
                  <li>上传、传播违规、侮辱、色情、暴力或侵犯他人权益的内容；</li>
                  <li>对 Echo 进行反向工程、破解或恶意攻击。</li>
                </ul>
                <p className="text-gray-700 leading-relaxed mt-3">
                  若您创建了分享链接，请您确保分享内容不侵犯他人合法权益；由此产生的纠纷由您自行承担相应责任。
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">四、知识产权</h3>
                <p className="text-gray-700 leading-relaxed">
                  Echo 的界面、图标、角色设计（包括 Echo 精灵、心树等）及相关文案均受版权法保护。未经许可不得复制、传播或商业使用。
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">五、免责声明</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>Echo 提供的内容仅作为自我管理与思考辅助，不构成心理或医学建议；</li>
                  <li>对于因网络故障、系统升级或不可抗力导致的服务中断，我们不承担赔偿责任。</li>
                </ul>
                <p className="text-gray-700 leading-relaxed mt-3">
                  Echo 会尽力保障数据一致性与安全，但互联网服务存在客观风险（例如网络波动、浏览器后台策略导致的中断）。我们建议您定期更新浏览器与系统，并在专注时尽量保持应用处于前台以获得最佳体验。
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">六、协议变更与终止</h3>
                <p className="text-gray-700 leading-relaxed">
                  我们可能根据产品优化调整本协议条款。若您继续使用 Echo，即视为同意更新后的条款。
                </p>
                <p className="text-gray-700 leading-relaxed mt-2">
                  若您严重违反本协议或相关法律法规，我们有权限制或终止向您提供服务，并在必要时依法配合相关部门。
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">七、联系方式</h3>
                <p className="text-gray-700 leading-relaxed">
                  📧 <a href="mailto:Caedmon_Izaya@outlook.com" className="text-teal-600 hover:text-teal-700 underline">Caedmon_Izaya@outlook.com</a>
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

