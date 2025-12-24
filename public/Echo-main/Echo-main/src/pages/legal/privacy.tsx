'use client';

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
              <p className="text-sm text-gray-500">最后更新日期：2025年11月</p>
            </div>

            <div className="prose prose-gray max-w-none space-y-6">
              <div>
                <p className="text-gray-700 leading-relaxed">
                  欢迎使用 Echo。我们深知个人信息对您的重要性，并会尽全力保护您的隐私安全。本政策旨在向您说明我们如何收集、使用、存储和保护您的个人信息。
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">一、我们收集的信息</h3>
                <p className="text-gray-700 leading-relaxed mb-3">
                  在您使用 Echo 的过程中，我们可能会收集以下类型的信息：
                </p>
                <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                  <li>账户信息：包括您注册时填写的用户名、邮箱、头像等；</li>
                  <li>安全信息：如您设置的密保问题及答案，用于找回密码；</li>
                  <li>使用数据：包括您的使用时间、操作记录、偏好数据，用于改进体验；</li>
                  <li>设备信息：如设备型号、系统版本、IP 地址等（仅用于安全分析和性能优化）。</li>
                </ol>
                <p className="text-gray-700 leading-relaxed mt-3">
                  我们不会收集与服务无关的个人信息，也不会以任何形式出售、出租或转让您的数据。
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">二、我们如何使用这些信息</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                  <li>提供、维护、改进我们的服务；</li>
                  <li>保障账户与数据安全；</li>
                  <li>向您提供更个性化的内容；</li>
                  <li>处理您反馈的问题与建议。</li>
                </ol>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">三、信息的存储与保护</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>我们将采取合理的安全措施（如加密存储、访问控制）保护您的数据；</li>
                  <li>您的数据将保存在中国境内的服务器；</li>
                  <li>一旦发生数据安全事件，我们会在法律规定时间内告知您。</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">四、您的权利</h3>
                <p className="text-gray-700 leading-relaxed mb-2">您可以在 Echo 中：</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>查看、更正、删除您的个人信息；</li>
                  <li>撤回授权；</li>
                  <li>注销账户（注销后您的所有数据将被删除或匿名化）。</li>
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
                  © 2025 Echo Project. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

