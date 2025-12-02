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
          {/* 页面导航 */}
          <section className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>🧭</span>
              快速导航
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* 数据说明 */}
          <section className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6 border border-orange-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>📊</span>
              数据说明
            </h3>
            <div className="space-y-3">
              {/* 今日节奏 */}
              <div className="p-4 bg-white rounded-xl">
                <div className="font-semibold text-gray-900 mb-1">今日节奏</div>
                <div className="text-sm text-gray-600">
                  用一行帮你看清：今天已经专注了多久，还差多少才能完成目标。
                </div>
              </div>

              {/* 完成进度 */}
              <div className="p-4 bg-white rounded-xl">
                <div className="font-semibold text-gray-900 mb-1">完成进度</div>
                <div className="text-sm text-gray-600">
                  告诉你：今天离「计划里写下的那件事」还有多远。
                </div>
              </div>

              {/* 连续专注 */}
              <div className="p-4 bg-white rounded-xl">
                <div className="font-semibold text-gray-900 mb-1">连续专注</div>
                <div className="text-sm text-gray-600">
                  最近一段连续完成专注目标的天数。
                </div>
              </div>

              {/* 心流指数 */}
              <div className="p-4 bg-white rounded-xl">
                <div className="font-semibold text-gray-900 mb-1">心流指数</div>
                <div className="text-sm text-gray-600">
                  用 0–100 分，概括你最近「专注得好不好、久不久、稳不稳」的综合表现。
                </div>
              </div>
            </div>
          </section>

          {/* 功能说明 / 常见问题（以「怎么做」为主） */}
          <section className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>❓</span>
              常见问题（怎么用）
            </h3>
            <div className="space-y-4">
              <details className="p-4 bg-white rounded-xl border border-gray-100">
                <summary className="font-semibold text-gray-900 cursor-pointer">
                  怎么切换「主要计划」？
                </summary>
                <p className="mt-2 text-sm text-gray-600">
                  打开「计划管理」页面，在计划列表里找到想设为主要的计划，点击更多操作（…）或编辑按钮，勾选「设为主要计划」即可。
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  设为主要计划后，仪表盘上的「完成进度」和「小目标」都会跟随这个计划更新。
                </p>
              </details>

              <details className="p-4 bg-white rounded-xl border border-gray-100">
                <summary className="font-semibold text-gray-900 cursor-pointer">
                  怎么添加小目标？
                </summary>
                <p className="mt-2 text-sm text-gray-600">
                  在「计划管理」页面，选择一个计划，进入详情或编辑界面，在「小目标」区域点击「新增小目标」，写下你想完成的一小步（例如：读完一章、写 500 字），保存即可。
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  建议把大目标拆成 3–5 个清晰的小目标，更容易看到自己的推进。
                </p>
              </details>

              <details className="p-4 bg-white rounded-xl border border-gray-100">
                <summary className="font-semibold text-gray-900 cursor-pointer">
                  怎么新建计划？怎么删除计划？
                </summary>
                <p className="mt-2 text-sm text-gray-600">
                  在「计划管理」页面点击「新建计划」，填写计划名称、每日目标时间和小目标，就能创建一个新的成长方向。
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  删除计划时，在计划卡片上点击更多操作（…）或删除按钮，系统会弹出确认提示，确认后该计划及其小目标都会被移除。
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  建议只删除不再有意义的计划，对还在犹豫的目标可以先暂停或取消主要计划标记。
                </p>
              </details>

              <details className="p-4 bg-white rounded-xl border border-gray-100">
                <summary className="font-semibold text-gray-900 cursor-pointer">
                  如何编辑计划内容？
                </summary>
                <p className="mt-2 text-sm text-gray-600">
                  在「计划管理」里点击某个计划的编辑按钮，可以修改计划名称、每日目标时间、小目标列表等内容；保存后，仪表盘会自动使用最新设置。
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  如果只是临时调整目标，可以先小幅修改每日目标，而不是直接删除计划。
                </p>
              </details>

              <details className="p-4 bg-white rounded-xl border border-gray-100">
                <summary className="font-semibold text-gray-900 cursor-pointer">
                  专注时如果意外退出，会发生什么？
                </summary>
                <p className="mt-2 text-sm text-gray-600">
                  专注过程中，如果你关闭页面、刷新或网络异常，系统会自动在本地保存当前进度；下次进入时，会根据记录补全到对应的「今日节奏」「本周专注」和「累计专注」中。
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  如果在很短时间内意外退出，可能只记下最近一次专注的结果，但不会影响你之前已记录的专注历史。
                </p>
              </details>
            </div>
          </section>

          {/* 底部提示 */}
          <div className="bg-gradient-to-r from-teal-100 to-cyan-100 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-700">
              💡 <strong>提示：</strong>点击右上角的 🔍 图标可以随时打开此指南
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
