import React, { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useInstallPrompt } from '~/hooks/useInstallPrompt';

interface QuickSearchGuideProps {
  onClose: () => void;
  /** 点击「再看一遍新手指引」时调用，用于回温/回坑用户重新看一遍新手引导 */
  onOpenRefresherGuide?: () => void;
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

export default function QuickSearchGuide({ onClose, onOpenRefresherGuide }: QuickSearchGuideProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'entries' | 'lumi' | 'checklist' | 'refresher'>('entries');
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const { state: installState, install } = useInstallPrompt();

  const entriesRef = useRef<HTMLDivElement>(null);
  const lumiRef = useRef<HTMLDivElement>(null);
  const checklistRef = useRef<HTMLDivElement>(null);
  const refresherRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (section: 'entries' | 'lumi' | 'checklist' | 'refresher') => {
    setActiveTab(section);
    const refs = { entries: entriesRef, lumi: lumiRef, checklist: checklistRef, refresher: refresherRef };
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
            <button
              onClick={() => scrollToSection('refresher')}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'refresher'
                  ? 'bg-white text-teal-600 shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              回温新手指引
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
                <CollapsibleSection title="个人中心">
                  <p className="text-gray-600">管理头像、昵称、账号安全，以及创建桌面快捷方式</p>
                  <p className="text-gray-600 mt-2">路径：主界面右上角 → 头像 → 个人中心</p>
                  <QuickActionButton
                    onClick={() => navigateTo('/profile')}
                    label="前往个人中心"
                  />
                </CollapsibleSection>

                <CollapsibleSection title="和 Lumi 聊天">
                  <p className="text-gray-600">进入 Lumi 对话室，闲聊或让 Lumi 帮你整理计划</p>
                  <p className="text-gray-600 mt-2">路径：主界面 →「和 Lumi 聊聊」按钮</p>
                  <QuickActionButton
                    onClick={() => navigateTo('/lumi')}
                    label="前往 Lumi 对话室"
                  />
                </CollapsibleSection>

                <CollapsibleSection title="快速开始专注">
                  <p className="text-gray-600">无需准备，直接开始深呼吸倒计时并进入专注</p>
                  <p className="text-gray-600 mt-2">路径：主界面 →「开始专注」按钮</p>
                  <QuickActionButton
                    onClick={() => navigateTo('/focus')}
                    label="前往专注页面"
                  />
                </CollapsibleSection>

                <CollapsibleSection title="星空日历">
                  <p className="text-gray-600">展示本月所有专注记录，每一次有小结的日子都会亮起一颗星星，点击可查看对应日期的小结内容</p>
                  <p className="text-gray-600 mt-2">路径：主界面 → 星空日历卡片 → 点击进入完整日历</p>
                  <QuickActionButton
                    onClick={() => navigateTo('/journal')}
                    label="查看完整日历"
                  />
                </CollapsibleSection>

                <CollapsibleSection title="回顾某天的小结">
                  <p className="text-gray-600">回看历史某一天写过的专注小结</p>
                  <p className="text-gray-600 mt-2">路径：主界面 → 星空日历卡片 → 完整日历 → 点击对应日期星星</p>
                  <QuickActionButton
                    onClick={() => navigateTo('/journal')}
                    label="前往星空日历"
                  />
                </CollapsibleSection>

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
                  <p className="text-gray-600 mt-2">路径：主界面 → 计划卡片 → 选中小目标（可多选）→ 完成</p>
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

                <CollapsibleSection title="快捷添加小目标">
                  <p className="text-gray-600">在主页面快速添加小目标</p>
                  <p className="text-gray-600 mt-2">路径：主界面 → 计划卡片 → 添加小目标 → 输入小目标 → 确认添加</p>
                </CollapsibleSection>

                <CollapsibleSection title="为今日设置动力小目标">
                  <p className="text-gray-600">每天登录时弹出的启动激励，选择一个今日最想冲刺的小目标</p>
                  <p className="text-gray-600 mt-2">路径：每日首次进入主界面时自动弹出，也可在计划卡片中选择</p>
                </CollapsibleSection>

                <CollapsibleSection title="创建桌面快捷方式">
                  <p className="text-gray-600 mb-3">把 Echo 添加到手机或电脑桌面，像打开 App 一样快速进入专注状态。</p>
                  {installState === 'installed' ? (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-teal-50 border border-teal-200 rounded-lg">
                      <svg className="w-4 h-4 text-teal-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      <span className="text-sm text-teal-700 font-medium">Echo 已添加到桌面</span>
                    </div>
                  ) : (
                    <button
                      onClick={async () => {
                        if (installState === 'available' || installState === 'idle') {
                          const result = await install();
                          if (result === 'unavailable') setShowIOSGuide(true);
                        } else {
                          setShowIOSGuide(true);
                        }
                      }}
                      className="w-full px-4 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                      添加到桌面
                    </button>
                  )}
                </CollapsibleSection>

                <CollapsibleSection title="Lumi 轻提醒">
                  <p className="text-gray-600">当你离开专注界面时，Lumi 可以用系统通知轻轻提醒你回来。不是催你，只是帮你把那一小段专注接回来。</p>
                  <p className="text-gray-600 mt-2">路径：个人中心 → 专注体验 → Lumi 轻提醒</p>
                  <QuickActionButton
                    onClick={() => navigateTo('/profile?view=gentle_reminder')}
                    label="前往设置轻提醒"
                  />
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

                <CollapsibleSection title="Lumi 对话室：随时可以找我聊天" defaultOpen>
                  <div className="space-y-2">
                    <p className="text-gray-700">
                      在对话室里，Lumi 可以做两件事：
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-gray-600">
                      <li><strong>闲聊</strong>：心情好或坏都行，Lumi 会接住你。不用有目的，说说就好。</li>
                      <li><strong>整理计划</strong>：脑子里有个模糊的念头？告诉 Lumi，它会帮你一步步整理成一个可以落地的小计划。</li>
                      <li>你也可以问 Lumi 关于 Echo 的任何问题，比如"怎么写小结""心树在哪"，它都知道。</li>
                    </ul>
                    <QuickActionButton
                      onClick={() => navigateTo('/lumi')}
                      label="去找 Lumi 聊聊"
                    />
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

                <CollapsibleSection title="星空日历：你的专注星图">
                  <div className="space-y-2">
                    <p className="text-gray-700">
                      主界面的深色星空卡片就是星空日历，记录了你本月每一次有小结的日子。
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-gray-600">
                      <li>每一颗亮着的星星都代表你留下了专注足迹的一天。</li>
                      <li>点击卡片可以进入完整日历，查看每一天的小结详情。</li>
                      <li>卡片上还会显示本月累计专注天数和总时长。</li>
                    </ul>
                    <QuickActionButton
                      onClick={() => navigateTo('/journal')}
                      label="查看完整星空日历"
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
                    看一眼「今日节奏」「完成进度」「Echo陪伴」，大致感受今天在什么位置。
                  </p>
                </CollapsibleSection>

                <CollapsibleSection title="2. 目标设定">
                  <p className="text-gray-700">
                    在主界面里面的橙色按钮，可以为今日设置一个干劲满满的小目标！设置完以后该小目标会闪闪发光等着你完成哦
                  </p>
                </CollapsibleSection>

                <CollapsibleSection title="3. 快速开始">
                  <p className="text-gray-700">
                    主界面点击「开始专注」按钮，无需准备和决策成本，直接进入深呼吸倒计时后开始专注。
                  </p>
                </CollapsibleSection>

                <CollapsibleSection title="4. 一次有仪式感的开始">
                  <div className="space-y-2">
                    <p className="text-gray-700">点击底部导航专注按钮</p>
                    <ul className="list-disc pl-5 space-y-1 text-gray-600">
                      <li>为自己精心设计一次特殊的专注行动</li>
                      <li>自定义专注时长，点击「开始专注」</li>
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
                      <li>写过小结的日子会在星空日历上亮起一颗星星</li>
                    </ul>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="6. 心树和星空日历">
                  <div className="space-y-2">
                    <ul className="list-disc pl-5 space-y-1 text-gray-600">
                      <li>去心树看看最近几天的节奏，给树浇水/施肥</li>
                      <li>在星空日历中回顾：这几天我是怎样在用自己的注意力的，每一颗星星都是一天的足迹</li>
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
                        前往星空日历
                      </button>
                    </div>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="7. 找 Lumi 聊聊">
                  <div className="space-y-2">
                    <p className="text-gray-700">
                      不管是想轻轻聊两句，还是脑子里有个模糊的念头想理清楚，Lumi 都在对话室等你。你也可以问它关于 Echo 的任何功能。
                    </p>
                    <QuickActionButton
                      onClick={() => navigateTo('/lumi')}
                      label="去找 Lumi"
                    />
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="8. 成就展柜">
                  <p className="text-gray-700">
                    你的专注积累下的点点滴滴，值得回顾和骄傲，据说拿到勋章有彩蛋？？
                  </p>
                </CollapsibleSection>

                <CollapsibleSection title="9. 收件箱">
                  <p className="text-gray-700">
                    每周周报的发送地！记得注意查收！偶尔也会收到心树和Lumi的问候哦
                  </p>
                </CollapsibleSection>
              </div>
            </div>
          </div>

          {/* 模块4：回温新手指引 */}
          <div ref={refresherRef} className="scroll-mt-6">
            <div className="bg-gradient-to-br from-violet-100 via-purple-50 to-fuchsia-100 rounded-3xl p-6 shadow-md border border-violet-200">
              <h3 className="text-xl font-bold text-violet-900 mb-4 flex items-center gap-2">
                <span>🔄</span>
                回温新手指引
              </h3>
              
              <div className="space-y-3">
                <CollapsibleSection title="忘记怎么用了？没关系" defaultOpen>
                  <p className="text-gray-700">
                    
                  </p>
                </CollapsibleSection>

                <CollapsibleSection title="再看一遍新手指引" defaultOpen>
                  <p className="text-gray-600 mb-3">
                    点击下方按钮，会关闭本快速指南并打开新手指引。Lumi 会依次带你认识主界面的计划卡片、快速开始按钮和小结卡片，几步就能回温核心用法。
                  </p>
                  {onOpenRefresherGuide ? (
                    <button
                      onClick={() => {
                        onOpenRefresherGuide();
                        onClose();
                      }}
                      className="w-full mt-2 px-5 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2"
                    >
                      <span>👋</span>
                      再看一遍新手指引
                    </button>
                  ) : (
                    <p className="text-sm text-gray-500">当前环境暂不支持播放新手指引。</p>
                  )}
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

      {/* 创建快捷方式 Modal */}
      {showIOSGuide && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="flex flex-col items-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">创建桌面快捷方式</h3>
              <p className="text-sm text-gray-500 mt-1 text-center">像打开 App 一样快速进入 Echo</p>
            </div>

            {installState === 'available' && (
              <>
                <p className="text-sm text-gray-600 text-center mb-6">
                  点击下方按钮，浏览器将弹出安装确认，完成后 Echo 图标会出现在你的桌面或开始菜单中。
                </p>
                <button
                  onClick={async () => {
                    setShowIOSGuide(false);
                    await install();
                  }}
                  className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold rounded-2xl shadow-lg shadow-teal-500/30 active:scale-95 transition-transform"
                >
                  确认，添加到桌面
                </button>
                <button onClick={() => setShowIOSGuide(false)} className="w-full mt-3 py-3 text-gray-400 text-sm">
                  暂不需要
                </button>
              </>
            )}

            {installState === 'ios' && (
              <>
                <p className="text-sm text-gray-600 text-center mb-5">在 iOS Safari 中，按以下步骤手动添加：</p>
                <div className="space-y-4 mb-6">
                  {[
                    { step: '1', title: '点击底部「分享」按钮', desc: '底部工具栏中间那个向上箭头的方形图标' },
                    { step: '2', title: '找到「添加到主屏幕」', desc: '在弹出菜单中向下滚动，找到带 ＋ 的选项' },
                    { step: '3', title: '点击右上角「添加」', desc: '可修改名称，点添加后图标出现在桌面' },
                  ].map(({ step, title, desc }) => (
                    <div key={step} className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">{step}</div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="w-full py-3 bg-teal-500 text-white font-medium rounded-2xl"
                >
                  好的，我去操作
                </button>
              </>
            )}

            {(installState === 'idle') && (
              <>
                <div className="flex flex-col items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
                    <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600 text-center leading-relaxed">
                    当前浏览器暂不支持一键安装，请使用 <span className="font-semibold text-gray-800">Chrome</span> 或 <span className="font-semibold text-gray-800">Edge</span> 打开 Echo 后再试。
                  </p>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="w-full py-3 bg-gray-100 text-gray-600 font-medium rounded-2xl"
                >
                  知道了
                </button>
              </>
            )}
          </div>
        </div>
      )}

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
