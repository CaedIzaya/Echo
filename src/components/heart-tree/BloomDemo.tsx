import React, { useState } from 'react';
import { useHeartTreeBloom } from '~/hooks/useHeartTreeBloom';

/**
 * 心树开花Demo面板
 * 
 * 用于测试和演示开花功能
 * 
 * 使用方法：
 * 在心树页面添加此组件即可显示测试面板
 * 
 * <BloomDemo />
 */
export const BloomDemo: React.FC = () => {
  const { isBlooming, bloomState, isChecking, checkBloom, triggerBloom, stopBloom } = useHeartTreeBloom();
  const [showPanel, setShowPanel] = useState(false);

  const handleCheck = async () => {
    await checkBloom();
  };

  const handleTrigger = async () => {
    await triggerBloom();
  };

  return (
    <>
      {/* 悬浮按钮 */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="fixed bottom-24 right-4 z-50 bg-pink-500 hover:bg-pink-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all"
        title="开花测试面板"
      >
        <span className="text-2xl">🌸</span>
      </button>

      {/* 测试面板 */}
      {showPanel && (
        <div className="fixed bottom-40 right-4 z-50 bg-white rounded-2xl shadow-2xl p-4 w-80 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-800">🌸 开花测试面板</h3>
            <button
              onClick={() => setShowPanel(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
            {/* 状态显示 */}
            <div className="bg-gray-50 rounded-lg p-3 text-xs">
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">开花状态:</span>
                <span className={`font-semibold ${isBlooming ? 'text-pink-600' : 'text-gray-400'}`}>
                  {isBlooming ? '🌸 开花中' : '🌿 未开花'}
                </span>
              </div>
              
              {bloomState && (
                <>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">可升级开花:</span>
                    <span className={bloomState.canLevelBloom ? 'text-green-600' : 'text-gray-400'}>
                      {bloomState.canLevelBloom ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">可卓越周开花:</span>
                    <span className={bloomState.canWeeklyBloom ? 'text-green-600' : 'text-gray-400'}>
                      {bloomState.canWeeklyBloom ? '✓' : '✗'}
                    </span>
                  </div>
                  {bloomState.reasons.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <span className="text-gray-600">原因:</span>
                      <ul className="mt-1 space-y-1">
                        {bloomState.reasons.map((reason, idx) => (
                          <li key={idx} className="text-pink-600">• {reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="space-y-2">
              <button
                onClick={handleCheck}
                disabled={isChecking}
                className="w-full py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition disabled:opacity-50"
              >
                {isChecking ? '检查中...' : '🔍 检查开花条件'}
              </button>

              <button
                onClick={handleTrigger}
                disabled={isBlooming}
                className="w-full py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold transition disabled:opacity-50"
              >
                🌸 触发开花动画
              </button>

              {isBlooming && (
                <button
                  onClick={stopBloom}
                  className="w-full py-2 rounded-lg bg-gray-500 hover:bg-gray-600 text-white text-sm font-semibold transition"
                >
                  ⏹ 停止开花
                </button>
              )}
            </div>

            {/* 说明 */}
            <div className="text-xs text-gray-500 pt-3 border-t border-gray-200">
              <p className="mb-2 font-semibold">开花条件：</p>
              <ul className="space-y-1 ml-3">
                <li>• 升级开花：心树升级 + 24小时冷却</li>
                <li>• 卓越周：满足以下任一</li>
                <li className="ml-3">- 平均心流指数 ≥ 70</li>
                <li className="ml-3">- 专注天数 ≥ 4天</li>
                <li className="ml-3">- 心流增幅 ≥ 10</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BloomDemo;





































