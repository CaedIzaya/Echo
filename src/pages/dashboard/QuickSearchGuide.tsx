import React from 'react';

interface QuickSearchGuideProps {
  onClose: () => void;
}

export default function QuickSearchGuide({ onClose }: QuickSearchGuideProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="sticky top-0 bg-gradient-to-r from-teal-500 to-cyan-500 text-white p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span>🔍</span>
              快速查找指南
            </h2>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 transition-all flex items-center justify-center"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-6 space-y-6">
          {/* 键盘快捷键 */}
          <section className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>⌨️</span>
              键盘快捷键
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                <span className="text-gray-700">开始专注</span>
                <kbd className="px-3 py-1 bg-gray-100 rounded-lg font-mono text-sm font-semibold">S</kbd>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                <span className="text-gray-700">暂停/继续</span>
                <kbd className="px-3 py-1 bg-gray-100 rounded-lg font-mono text-sm font-semibold">Space</kbd>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                <span className="text-gray-700">结束专注</span>
                <kbd className="px-3 py-1 bg-gray-100 rounded-lg font-mono text-sm font-semibold">E</kbd>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                <span className="text-gray-700">返回首页</span>
                <kbd className="px-3 py-1 bg-gray-100 rounded-lg font-mono text-sm font-semibold">H</kbd>
              </div>
            </div>
          </section>

          {/* 页面导航 */}
          <section className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>🧭</span>
              快速导航
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a href="/dashboard" className="block p-4 bg-white rounded-xl hover:shadow-md transition-all border-2 border-blue-100">
                <div className="text-3xl mb-2">📊</div>
                <div className="font-semibold text-gray-900">数据概览</div>
                <div className="text-sm text-gray-500">查看专注统计与进度</div>
              </a>
              <a href="/focus" className="block p-4 bg-white rounded-xl hover:shadow-md transition-all border-2 border-teal-100">
                <div className="text-3xl mb-2">⏱️</div>
                <div className="font-semibold text-gray-900">专注计时</div>
                <div className="text-sm text-gray-500">开始新的专注会话</div>
              </a>
              <a href="/plans" className="block p-4 bg-white rounded-xl hover:shadow-md transition-all border-2 border-purple-100">
                <div className="text-3xl mb-2">📋</div>
                <div className="font-semibold text-gray-900">计划管理</div>
                <div className="text-sm text-gray-500">创建和管理专注计划</div>
              </a>
            </div>
          </section>

          {/* 功能查找 */}
          <section className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>⚡</span>
              常用功能快速查找
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 功能项目 */}
              {[
                { icon: '📈', name: '本周统计', desc: '查看本周专注时长与趋势', path: 'dashboard#stats' },
                { icon: '🏆', name: '成就系统', desc: '查看已解锁成就与徽章', path: 'dashboard#achievements' },
                { icon: '📝', name: '每日小结', desc: '回顾今日专注记录', path: 'dashboard#summary' },
                { icon: '🎯', name: '小目标', desc: '管理计划中的小目标', path: 'dashboard#milestones' },
                { icon: '⭐', name: '心流指数', desc: '查看专注质量评分', path: 'dashboard#flow' },
                { icon: '🔥', name: '连续天数', desc: '查看连续专注记录', path: 'dashboard#streak' },
              ].map((item, idx) => (
                <div key={idx} className="p-4 bg-white rounded-xl hover:shadow-md transition-all border border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-500">{item.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 数据类型 */}
          <section className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6 border border-orange-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>📊</span>
              数据说明
            </h3>
            <div className="space-y-3">
              <div className="p-4 bg-white rounded-xl">
                <div className="font-semibold text-gray-900 mb-1">今日分钟数</div>
                <div className="text-sm text-gray-600">今天已经专注的总时长（分钟）</div>
              </div>
              <div className="p-4 bg-white rounded-xl">
                <div className="font-semibold text-gray-900 mb-1">今日目标</div>
                <div className="text-sm text-gray-600">每日计划的专注时长目标</div>
              </div>
              <div className="p-4 bg-white rounded-xl">
                <div className="font-semibold text-gray-900 mb-1">本周分钟数</div>
                <div className="text-sm text-gray-600">本周累计专注的总时长</div>
              </div>
              <div className="p-4 bg-white rounded-xl">
                <div className="font-semibold text-gray-900 mb-1">连续天数</div>
                <div className="text-sm text-gray-600">连续专注的天数（每日至少一次）</div>
              </div>
              <div className="p-4 bg-white rounded-xl">
                <div className="font-semibold text-gray-900 mb-1">心流指数</div>
                <div className="text-sm text-gray-600">综合专注质量、时长和频率的计算评分（0-100）</div>
              </div>
            </div>
          </section>

          {/* 常见问题 */}
          <section className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>❓</span>
              常见问题
            </h3>
            <div className="space-y-4">
              <details className="p-4 bg-white rounded-xl border border-gray-100">
                <summary className="font-semibold text-gray-900 cursor-pointer">
                  如何保存专注进度？
                </summary>
                <p className="mt-2 text-sm text-gray-600">
                  系统每10秒自动保存一次，关闭页面时也会自动保存。重新打开页面时会自动恢复未完成的专注会话。
                </p>
              </details>
              <details className="p-4 bg-white rounded-xl border border-gray-100">
                <summary className="font-semibold text-gray-900 cursor-pointer">
                  专注计时支持暂停吗？
                </summary>
                <p className="mt-2 text-sm text-gray-600">
                  支持！每次专注会话可以暂停1次。暂停期间不会计入专注时长。
                </p>
              </details>
              <details className="p-4 bg-white rounded-xl border border-gray-100">
                <summary className="font-semibold text-gray-900 cursor-pointer">
                  如何修改每日目标？
                </summary>
                <p className="mt-2 text-sm text-gray-600">
                  在"计划管理"页面找到主要计划，点击编辑可以修改每日目标时长（分钟）。
                </p>
              </details>
              <details className="p-4 bg-white rounded-xl border border-gray-100">
                <summary className="font-semibold text-gray-900 cursor-pointer">
                  心流指数如何计算？
                </summary>
                <p className="mt-2 text-sm text-gray-600">
                  基于专注质量（评分、完成率）、专注时长（平均时长、最长时长）、专注习惯（会话数、连续性、趋势）三个维度综合计算。
                </p>
              </details>
              <details className="p-4 bg-white rounded-xl border border-gray-100">
                <summary className="font-semibold text-gray-900 cursor-pointer">
                  数据存储在哪里？
                </summary>
                <p className="mt-2 text-sm text-gray-600">
                  所有数据存储在浏览器本地（localStorage），无需网络即可使用。如需云端同步，请确保登录账户。
                </p>
              </details>
            </div>
          </section>

          {/* 底部提示 */}
          <div className="bg-gradient-to-r from-teal-100 to-cyan-100 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-700">
              💡 <strong>提示：</strong>在所有页面输入框中使用 <kbd className="px-2 py-1 bg-white rounded font-mono text-xs">/</kbd> 可快速打开此搜索指南
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
