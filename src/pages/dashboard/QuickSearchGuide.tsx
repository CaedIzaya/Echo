import React, { useState, useRef } from 'react';
import { useRouter } from 'next/router';

interface QuickSearchGuideProps {
  onClose: () => void;
}

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-800">{title}</span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-1 text-sm text-gray-700 space-y-2 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

interface QuickActionButtonProps {
  onClick: () => void;
  label: string;
}

function QuickActionButton({ onClick, label }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="mt-3 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white text-xs font-medium rounded-lg transition-all shadow-sm hover:shadow-md"
    >
      {label}
    </button>
  );
}

export default function QuickSearchGuide({ onClose }: QuickSearchGuideProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'entries' | 'lumi' | 'checklist'>('entries');
  
  const entriesRef = useRef<HTMLDivElement>(null);
  const lumiRef = useRef<HTMLDivElement>(null);
  const checklistRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (section: 'entries' | 'lumi' | 'checklist') => {
    setActiveTab(section);
    const refs = { entries: entriesRef, lumi: lumiRef, checklist: checklistRef };
    refs[section].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const navigateTo = (path: string) => {
    onClose();
    router.push(path);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* 头部 */}
        <div className="sticky top-0 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 text-white p-5 z-10 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span>🧭</span>
              Echo 快速指南
            </h2>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 transition-all flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 顶部导航 */}
          <div className="flex gap-2">
            <button
              onClick={() => scrollToSection('entries')}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'entries'
                  ? 'bg-white text-teal-600 shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              不清楚的功能入口
            </button>
            <button
              onClick={() => scrollToSection('lumi')}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'lumi'
                  ? 'bg-white text-teal-600 shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              Lumi和心树是什么？
            </button>
            <button
              onClick={() => scrollToSection('checklist')}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'checklist'
                  ? 'bg-white text-teal-600 shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              一天的Echo使用
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="overflow-y-auto p-6 space-y-6">
          
          {/* 模块1：不清楚的功能入口 */}
          <div ref={entriesRef} className="scroll-mt-6">
            <div className="bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 rounded-3xl p-6 shadow-md border border-orange-200">
              <h3 className="text-xl font-bold text-orange-900 mb-4 flex items-center gap-2">
                <span>🔑</span>
                快捷功能入口
              </h3>
              
              <div className="space-y-3">
                <CollapsibleSection title="设置密保">
                  <p className="text-gray-600">路径：主界面 → 右上角头像 → 个人中心 → 账号安全 → 设置密保问题</p>
                  <QuickActionButton 
                    onClick={() => navigateTo('/profile/security-questions')} 
                    label="直达设置密保" 
                  />
                </CollapsibleSection>

                <CollapsibleSection title="修改密码">
                  <p className="text-gray-600">路径：主界面 → 右上角头像 → 个人中心 → 账号安全</p>
                  <QuickActionButton 
                    onClick={() => navigateTo('/profile')} 
                    label="直达个人中心" 
                  />
                </CollapsibleSection>

                <CollapsibleSection title="更换头像">
                  <p className="text-gray-600">路径：主界面 → 右上角头像 → 个人中心 → 点击头像</p>
                  <QuickActionButton 
                    onClick={() => navigateTo('/profile')} 
                    label="直达个人中心" 
                  />
                </CollapsibleSection>

                <CollapsibleSection title="编辑计划内容">
                  <p className="text-gray-600">修改计划名称、每日专注时长等</p>
                  <p className="text-gray-600 mt-2">路径：底部导航到计划 → 计划卡片右侧编辑按钮</p>
                  <QuickActionButton 
                    onClick={() => navigateTo('/plans')} 
                    label="前往计划页面" 
                  />
                </CollapsibleSection>

                <CollapsibleSection title="管理小目标">
                  <p className="text-gray-600">增加、删除、查看小目标</p>
                  <p className="text-gray-600 mt-2">路径：底部导航到计划 → 管理小目标</p>
                  <QuickActionButton 
                    onClick={() => navigateTo('/plans')} 
                    label="前往计划页面" 
                  />
                </CollapsibleSection>

                <CollapsibleSection title="小目标完成">
                  <p className="text-gray-600">在主页面快速完成小目标</p>
                  <p className="text-gray-600 mt-2">路径：主页面 → 计划卡片 → 选中小目标（可多选）→ 完成</p>
                </CollapsibleSection>

                <CollapsibleSection title="新建计划">
                  <p className="text-gray-600">创建一个新的专注计划</p>
                  <p className="text-gray-600 mt-2">路径：底部导航到计划 → 右上角新建按钮</p>
                  <QuickActionButton 
                    onClick={() => navigateTo('/plans')} 
                    label="前往计划页面" 
                  />
                </CollapsibleSection>

                <CollapsibleSection title="删除计划">
                  <p className="text-gray-600">删除不再需要的计划</p>
                  <p className="text-gray-600 mt-2">路径：底部导航到计划 → 右上角管理按钮 → 选中对应卡片 → 删除</p>
                </CollapsibleSection>

                <CollapsibleSection title="切换主要计划">
                  <p className="text-gray-600">将某个计划设置为主要计划</p>
                  <p className="text-gray-600 mt-2">路径：底部导航到计划 → 右上角管理按钮 → 选中对应卡片（非主要计划）→ 设置为主要计划</p>
                </CollapsibleSection>

                <CollapsibleSection title="完成计划">
                  <p className="text-gray-600">标记计划为已完成</p>
                  <p className="text-gray-600 mt-2">路径：底部导航到计划 → 右上角管理按钮 → 选中对应卡片 → 完成</p>
                </CollapsibleSection>

                <CollapsibleSection title="回顾计划">
                  <p className="text-gray-600">查看已完成计划的回顾</p>
                  <p className="text-gray-600 mt-2">路径：底部导航到计划 → 右上角管理按钮 → 选中对应卡片（已完成）→ 回顾计划</p>
                </CollapsibleSection>

                <CollapsibleSection title="回顾小结">
                  <p className="text-gray-600">查看历史某天的小结</p>
                  <p className="text-gray-600 mt-2">路径：主界面 → 日记卡片点击 → 点击对应日期方格</p>
                  <QuickActionButton 
                    onClick={() => navigateTo('/journal')} 
                    label="前往日记页面" 
                  />
                </CollapsibleSection>

                <CollapsibleSection title="快捷添加小目标">
                  <p className="text-gray-600">在主页面快速添加小目标</p>
                  <p className="text-gray-600 mt-2">路径：主界面 → 计划卡片 → 添加小目标 → 输入小目标 → 确认添加</p>
                </CollapsibleSection>

                <CollapsibleSection title="快速开始">
                  <p className="text-gray-600">无需准备，直接开始专注</p>
                  <p className="text-gray-600 mt-2">路径：主界面 → 计划卡片 → 快速开始</p>
                </CollapsibleSection>

                <CollapsibleSection title="为今日设置动力小目标">
                  <p className="text-gray-600">设置今日的目标动力</p>
                  <p className="text-gray-600 mt-2">路径：主界面 → 目标设定 → 选中目标</p>
                </CollapsibleSection>
              </div>
            </div>
          </div>

          {/* 模块2：Lumi和心树是什么 */}
          <div ref={lumiRef} className="scroll-mt-6">
            <div className="bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100 rounded-3xl p-6 shadow-md border border-emerald-200">
              <h3 className="text-xl font-bold text-emerald-900 mb-4 flex items-center gap-2">
                <span>✨</span>
                Lumi 和心树是什么？
              </h3>
              
              <div className="space-y-3">
                <CollapsibleSection title="Lumi 小精灵：可爱的光精灵" defaultOpen>
                  <div className="space-y-2">
                    <p className="text-gray-700">
                      Lumi 是你在注意力夺回旅途中的第一个伙伴，一颗会发光的小精灵。
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-gray-600">
                      <li>你越愿意回到这里、开始专注，它就会越亮，存在感越强。</li>
                      <li>它会用轻松、偶尔有点调皮的话，帮你看见自己现在的状态。</li>
                      <li>没事的时候也可以多去找 Lumi 说说话，偶尔会解锁一些小彩蛋。</li>
                    </ul>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="心树：沉寂很久后重新生长的树" defaultOpen>
                  <div className="space-y-2">
                    <p className="text-gray-700">
                      心树原本是一棵沉寂了很久的树，直到遇见你和 Lumi，才重新开始生长。
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-gray-600">
                      <li>你每一次专注、每一个小目标、每一段稳定的节奏，都会让它长出新的年轮。</li>
                      <li>你越专注，Lumi 越亮，心树的年轮也会越浓密、扎得更稳。</li>
                      <li>在心树页面，你可以给它浇水、施肥，顺便和它聊聊最近的自己。</li>
                    </ul>
                    <QuickActionButton 
                      onClick={() => navigateTo('/heart-tree')} 
                      label="前往心树页面" 
                    />
                  </div>
                </CollapsibleSection>
              </div>
            </div>
          </div>

          {/* 模块3：一天的Echo使用 */}
          <div ref={checklistRef} className="scroll-mt-6">
            <div className="bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100 rounded-3xl p-6 shadow-md border border-blue-200">
              <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                <span>🧭</span>
                一天怎么用 Echo？
              </h3>
              
              <div className="space-y-3">
                <CollapsibleSection title="1. 打开仪表盘（当前首页）" defaultOpen>
                  <p className="text-gray-700">
                    看一眼「今日节奏」「完成进度」「连续专注」，大致感受今天在什么位置。
                  </p>
                </CollapsibleSection>

                <CollapsibleSection title="2. 目标设定">
                  <p className="text-gray-700">
                    在主界面里面的橙色按钮，可以为今日设置一个干劲满满的小目标！设置完以后该小目标会闪闪发光等着你完成哦
                  </p>
                </CollapsibleSection>

                <CollapsibleSection title="3. 快速开始">
                  <p className="text-gray-700">
                    无需准备和决策成本，直接开始深呼吸倒计时，直接进入专注。
                  </p>
                </CollapsibleSection>

                <CollapsibleSection title="4. 一次有仪式感的开始">
                  <div className="space-y-2">
                    <p className="text-gray-700">点击底部导航专注按钮</p>
                    <ul className="list-disc pl-5 space-y-1 text-gray-600">
                      <li>为自己精心设计一次特殊的专注行动</li>
                      <li>点击「开始专注」</li>
                      <li>正式进入一次清晰的时间切片专注</li>
                      <li>中途若中断，系统会如实记录</li>
                    </ul>
                    <QuickActionButton 
                      onClick={() => navigateTo('/focus')} 
                      label="前往专注页面" 
                    />
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="5. 专注结束后">
                  <div className="space-y-2">
                    <p className="text-gray-700">回到主界面前，可以选择顺手写个小结，并生成精美的小结卡片</p>
                    <ul className="list-disc pl-5 space-y-1 text-gray-600">
                      <li>如果不是很有灵感，小结可以随机生成一份，回到主界面也可以随心写</li>
                      <li>回到仪表盘，看看今日分钟数、本周统计有没有一点点上升</li>
                      <li>如果完成了某个小目标，在计划中勾选它，为自己点赞！</li>
                    </ul>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="6. 心树和日记">
                  <div className="space-y-2">
                    <ul className="list-disc pl-5 space-y-1 text-gray-600">
                      <li>去心树看看最近几天的节奏，给树浇水/施肥</li>
                      <li>可以去日记简单回顾：这几天我是怎样在用自己的注意力的</li>
                    </ul>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => navigateTo('/heart-tree')}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-medium rounded-lg transition-all shadow-sm"
                      >
                        前往心树
                      </button>
                      <button
                        onClick={() => navigateTo('/journal')}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-medium rounded-lg transition-all shadow-sm"
                      >
                        前往日记
                      </button>
                    </div>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="7. 成就展柜">
                  <p className="text-gray-700">
                    你的专注积累下的点点滴滴，值得回顾和骄傲，据说拿到勋章有彩蛋？？
                  </p>
                </CollapsibleSection>

                <CollapsibleSection title="8. 收件箱">
                  <p className="text-gray-700">
                    每周周报的发送地！记得注意查收！偶尔也会收到心树和Lumi的问候哦
                  </p>
                </CollapsibleSection>
              </div>
            </div>
          </div>

          {/* 底部提示 */}
          <div className="bg-gradient-to-r from-teal-100 via-cyan-100 to-blue-100 rounded-2xl p-5 text-center border border-teal-200">
            <p className="text-sm text-gray-700">
              💡 <strong>如果你在某个页面不知道下一步该做什么</strong><br />
              可以回到仪表盘、点点小精灵、或者再次打开右上角的 🔍，让我们一起重新整理节奏。
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .scroll-mt-6 {
          scroll-margin-top: 1.5rem;
        }
      `}</style>
    </div>
  );
}
