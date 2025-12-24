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
          {/* 1. 总览：这个产品是做什么的 */}
          <section className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6 border border-teal-100">
            <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span>🌱</span>
              Echo 是什么？
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              Echo 不是一个“逼你高效”的工具，而是一个帮你<strong>看见自己节奏</strong>、<strong>建立温柔专注习惯</strong>的小空间。
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
              <li>用 <strong>专注计时</strong> 开一段清晰的时间边界</li>
              <li>用 <strong>计划 & 小目标</strong> 把“大事”切成可迈出去的小步</li>
              <li>让 <strong>心树</strong> 记录你的长期节奏和起伏</li>
              <li>通过 <strong>Lumi 小精灵 + 深度觉察</strong>，在困难时被“看见”而不是被催促</li>
              <li>用 <strong>成就 & 邮件</strong> 回看你已经走过的路</li>
            </ul>
          </section>

          {/* 2. 如何开始：一天的推荐使用流程 */}
          <section className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>🧭</span>
              一天怎么用 Echo？
            </h3>
            <ol className="list-decimal pl-5 space-y-3 text-sm text-gray-700">
              <li>
                <strong>打开仪表盘</strong>（当前首页）<br />
                看一眼「今日节奏」「完成进度」「连续专注」，大致感受今天在什么位置。
              </li>
              <li>
                <strong>选一个计划</strong>（或创建一个）<br />
                - 从底部导航进入 <strong>计划</strong>（Plans）页<br />
                - 设定/调整 <strong>“今日主要计划”</strong> 和每日目标分钟数
              </li>
              <li>
                <strong>开始专注</strong><br />
                - 仪表盘点击「开始专注」，进入专注计时页<br />
                - 选好时长，开始一次清晰的时间切片；中途若中断，系统会如实记录
              </li>
              <li>
                <strong>专注结束后</strong><br />
                - 回到仪表盘，看看今日分钟数、本周统计有没有一点点上升<br />
                - 如果完成了某个小目标，在计划中勾选它，触发成就/心树成长
              </li>
              <li>
                <strong>睡前或某个空档</strong><br />
                - 去 <strong>心树</strong> 看看最近几天的节奏，给树浇水/施肥<br />
                - 可以简单回顾：这几天我是怎样在用自己的注意力的？
              </li>
            </ol>
          </section>

          {/* 3. 核心区域解析（仪表盘 & 关键模块） */}
          <section className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6 border border-orange-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>📊</span>
              仪表盘上的每一块在说什么？
            </h3>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="p-4 bg-white rounded-xl">
                <div className="font-semibold text-gray-900 mb-1">今日节奏</div>
                <p>一句话告诉你：今天已经专注了多久、今天大概是什么「味道」。</p>
              </div>
              <div className="p-4 bg-white rounded-xl">
                <div className="font-semibold text-gray-900 mb-1">完成进度</div>
                <p>围绕当前「主要计划」，看今天离“写下的那件事”还有多远。</p>
              </div>
              <div className="p-4 bg-white rounded-xl">
                <div className="font-semibold text-gray-900 mb-1">连续专注 / 心流指数</div>
                <p>连续天数帮你看「有多稳」，心流指数帮你感受最近整体状态好不好，而不是只看今天。</p>
              </div>
              <div className="p-4 bg-white rounded-xl">
                <div className="font-semibold text-gray-900 mb-1">成就 & 邮件</div>
                <p>这里不是打卡排行榜，而是你过去这些天的“证据”和“回信”。看不懂产品时，也可以从欢迎邮件和这里的提示重新理一遍。</p>
              </div>
            </div>
          </section>

          {/* 4. Lumi 小精灵 & 心树：你的同行伙伴 */}
          <section className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>✨</span>
              Lumi 小精灵 & 心树 在做什么？
            </h3>
            <div className="space-y-3 text-sm text-gray-700">
              <details className="p-4 bg-white rounded-xl" open>
                <summary className="font-semibold text-gray-900 cursor-pointer">
                  Lumi 小精灵：可爱的光精灵
                </summary>
                <div className="mt-2 space-y-2">
                  <p>
                    Lumi 是你在注意力夺回旅途中的第一个伙伴，一颗会发光的小精灵。
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>你越愿意回到这里、开始专注，它就会越亮，存在感越强。</li>
                    <li>它会用轻松、偶尔有点调皮的话，帮你看见自己现在的状态。</li>
                    <li>没事的时候也可以多去找 Lumi 说说话，偶尔会解锁一些小彩蛋。</li>
                  </ul>
                </div>
              </details>

              <details className="p-4 bg-white rounded-xl">
                <summary className="font-semibold text-gray-900 cursor-pointer">
                  心树：沉寂很久后重新生长的树
                </summary>
                <div className="mt-2 space-y-2">
                  <p>
                    心树原本是一棵沉寂了很久的树，直到遇见你和 Lumi，才重新开始生长。
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>你每一次专注、每一个小目标、每一段稳定的节奏，都会让它长出新的年轮。</li>
                    <li>你越专注，Lumi 越亮，心树的年轮也会越浓密、扎得更稳。</li>
                    <li>在心树页面，你可以给它浇水、施肥，顺便和它聊聊最近的自己。</li>
                  </ul>
                </div>
              </details>
            </div>
          </section>

          {/* 5. 计划系统 & 小结系统：怎么更好地用起来 */}
          <section className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>🗺️</span>
              计划系统 & 小结系统
            </h3>
            <div className="space-y-3 text-sm text-gray-700">
              <details className="p-4 bg-white rounded-xl border border-gray-100" open>
                <summary className="font-semibold text-gray-900 cursor-pointer">
                  计划系统：从「想做」到「能做」
                </summary>
                <div className="mt-2 space-y-2">
                  <p>计划系统帮助你把一个模糊的愿望，拆成可以慢慢靠近的路径。</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      在底部导航进入 <strong>计划</strong> 页面，新建计划：给它起个名字、设定「每日目标分钟数」。
                    </li>
                    <li>
                      在计划详情里添加 <strong>小目标</strong>：例如「读完一章」「写 500 字」。建议 3–5 个即可。
                    </li>
                    <li>
                      选择一个计划设为 <strong>主要计划</strong>，仪表盘上的「完成进度」会自动跟随它更新。
                    </li>
                    <li>
                      完成某个小目标时，在计划里勾选它，既更新成就，也会反馈到心树的成长里。</li>
                  </ul>
                </div>
              </details>

              <details className="p-4 bg-white rounded-xl border border-gray-100">
                <summary className="font-semibold text-gray-900 cursor-pointer">
                  小结系统：帮你「看见自己到底做了什么」
                </summary>
                <div className="mt-2 space-y-2">
                  <p>小结不是作文，而是给自己的一点「对话记录」。</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      在仪表盘中找到 <strong>今日小结</strong> 卡片（通常在下方），点击进入小结页面。
                    </li>
                    <li>
                      你可以简单写下：今天做了什么、哪里卡住了、明天想试试哪一种不一样的走法。</li>
                    <li>
                      小结会和你的专注记录、心树成长一起被保存下来，方便之后回看一段时间的变化。</li>
                    <li>
                      建议的频率：不是每天都必须写，但在「有变化的那几天」多写一写，会非常有价值。</li>
                  </ul>
                </div>
              </details>
            </div>
          </section>

          {/* 6. 不那么明显的入口 & 小技巧 */}
          <section className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>🕵️‍♀️</span>
              不太明显，但很重要的入口
            </h3>
            <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700">
              <li>
                <strong>右上角 🔍</strong>：随时打开本指南，重新熟悉产品。
              </li>
              <li>
                <strong>底部导航</strong>：主页 / 计划 / 心树 / 个人页，在不同设备宽度下布局略有变化，但始终在底部。
              </li>
              <li>
                <strong>仪表盘中的卡片</strong>：大部分卡片都可以点击，进入更详细的页面（例如计划详情、成就、邮件）。看到“像卡片”的东西，都可以试着点一下。
              </li>
              <li>
                <strong>个人页 & 安全问题</strong>：在个人页可以配置安全问题，帮助你在忘记密码或换设备时更安全地找回账号。
              </li>
              <li>
                <strong>邮件中心</strong>：未来会承载更新日志、使用小贴士、来自 Echo 的“长信”，有空可以翻一翻。
              </li>
            </ul>
          </section>

          {/* 7. 底部提示 */}
          <div className="bg-gradient-to-r from-teal-100 to-cyan-100 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-700">
              💡 <strong>如果你在某个页面不知道下一步该做什么</strong>：<br />
              可以回到仪表盘、点点小精灵、或者再次打开右上角的 🔍，让我们一起重新整理节奏。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
