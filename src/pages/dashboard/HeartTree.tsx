import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  HeartTreeManager,
  HeartTree,
  GROWTH_THRESHOLDS
} from '~/lib/HeartTreeSystem';
import {
  HeartTreeExpState,
  loadHeartTreeExpState,
  waterTree,
  grantFertilizerBuff,
  getHeartTreeLevelView,
  getFertilizerMultiplier,
  canWaterToday,
  WATER_BASE_EXP,
} from '~/lib/HeartTreeExpSystem';
import { HeartTree as BigHeartTree } from '~/components/heart-tree/HeartTree';
import {
  getRandomHeartTreeMessage,
  getRandomWaterMessage,
  getRandomFertilizeMessage,
} from '~/lib/heartTreeDialogue';

interface HeartTreeProps {
  flowIndex?: number;
  flowIndexIncrease?: number;
  streakDays?: number;
  weeklyLongestSession?: number;
  monthlyStreak?: number;
  weeklyNewAchievements?: string[];
  todaySessions?: number;
  completedMilestonesToday?: number;
  dailyGoalCompleted?: boolean;
  newAchievementsToday?: number;
}

export default function HeartTreeComponent(props: HeartTreeProps) {
  const [tree, setTree] = useState<HeartTree>(HeartTreeManager.initialize());
  const [expState, setExpState] = useState<HeartTreeExpState>(loadHeartTreeExpState());
  const [showMessage, setShowMessage] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [flowers, setFlowers] = useState<Array<{ id: number; x: number; y: number; content?: string }>>([]);
  const [isWatering, setIsWatering] = useState(false);
  const [isFertilizing, setIsFertilizing] = useState(false);
  const [waterOpportunities, setWaterOpportunities] = useState(props.completedMilestonesToday || 0);
  const [fertilizeOpportunities, setFertilizeOpportunities] = useState(props.newAchievementsToday || 0);
  const flowerIdRef = React.useRef(0);
  const treeMessageTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 加载心树数据
  useEffect(() => {
    const loadedTree = HeartTreeManager.getTree();
    setTree(loadedTree);
    
    // 加载 EXP 状态
    const loadedExpState = loadHeartTreeExpState();
    setExpState(loadedExpState);
    
    // 从localStorage获取累积的机会数量
    const updateOpportunities = () => {
      const waterOps = HeartTreeManager.getWaterOpportunities();
      const fertilizeOps = HeartTreeManager.getFertilizeOpportunities();
      setWaterOpportunities(waterOps);
      setFertilizeOpportunities(fertilizeOps);
    };
    
    updateOpportunities();
    
    // 定期刷新机会数量（每2秒）
    const interval = setInterval(updateOpportunities, 2000);
    
    // 更新开花状态
    if (props.flowIndex !== undefined || props.flowIndexIncrease !== undefined) {
      const newBloomState = HeartTreeManager.checkBloomState(
        loadedTree,
        props.flowIndex || 0,
        props.flowIndexIncrease || 0
      );
      if (newBloomState !== loadedTree.bloomState) {
        const updated = { ...loadedTree, bloomState: newBloomState };
        HeartTreeManager.save(updated);
        setTree(updated);
      }
    }
    
    return () => clearInterval(interval);
  }, [props.flowIndex, props.flowIndexIncrease]);

  // 检查落花
  useEffect(() => {
    const interval = setInterval(() => {
      const shouldDrop = HeartTreeManager.shouldDropFlower(
        tree,
        props.streakDays || 0,
        (props.flowIndex || 0) >= 80
      );
      
      if (shouldDrop) {
        dropFlower();
      }
    }, 5000); // 每5秒检查一次
    
    return () => clearInterval(interval);
  }, [tree, props.streakDays, props.flowIndex]);

  // 落花动画（静止在小树旁）
  const dropFlower = useCallback(() => {
    const content = HeartTreeManager.getFlowerContent({
      weeklyLongestSession: props.weeklyLongestSession,
      monthlyStreak: props.monthlyStreak,
      weeklyNewAchievements: props.weeklyNewAchievements,
      currentFlowIndex: props.flowIndex
    });
    
    const flowerId = flowerIdRef.current++;
    // 在小树两侧随机位置（40-60%之间，靠近树的位置）
    const startX = Math.random() * 20 + 40; // 40-60%
    const startY = 60 + Math.random() * 20; // 60-80%，在树的高度范围内
    
    const newFlower = {
      id: flowerId,
      x: startX,
      y: startY,
      content: content
    };
    
    setFlowers(prev => [...prev, newFlower]);
    
    // 10秒后移除花朵，让用户有足够时间看到内容
    setTimeout(() => {
      setFlowers(prev => prev.filter(f => f.id !== flowerId));
    }, 10000);
  }, [props.weeklyLongestSession, props.monthlyStreak, props.weeklyNewAchievements, props.flowIndex]);

  // 浇水
  const handleWater = () => {
    // 检查今天是否可以浇水（需要完成至少一次专注）
    const today = new Date().toISOString().split('T')[0];
    const hasCompletedFocusToday = (props.todaySessions || 0) > 0;
    
    if (!canWaterToday(expState, today, hasCompletedFocusToday)) {
      showTreeMessage('今天已经浇过水了，或者还没有完成专注哦~');
      return;
    }
    
    setIsWatering(true);
    
    // 使用新的 EXP 系统浇水
    const updatedExpState = waterTree(expState);
    setExpState(updatedExpState);
    
    // 同时更新旧的心树系统（保持兼容）
    const updated = HeartTreeManager.waterTree(tree, 1);
    setTree(updated);
    
    // 显示浇水文案（情绪文案 + 经验信息）
    const levelView = getHeartTreeLevelView(updatedExpState);
    const emotional = getRandomWaterMessage();
    showTreeMessage(`${emotional}\n（浇水成功，获得 ${WATER_BASE_EXP} EXP · 当前 Lv.${levelView.level}）`);
    
    setTimeout(() => setIsWatering(false), 1000);
  };

  // 施肥
  const handleFertilize = () => {
    // 检查是否有施肥机会（通过成就、等级提升、连续天数等触发）
    if (fertilizeOpportunities <= 0) {
      showTreeMessage('还没有施肥机会哦~ 完成成就或达到关键节点可以获得！');
      return;
    }
    
    setIsFertilizing(true);
    
    // 使用新的 EXP 系统施肥
    const updatedExpState = grantFertilizerBuff(expState);
    setExpState(updatedExpState);
    
    // 同时更新旧的心树系统（保持兼容）
    const updated = HeartTreeManager.fertilizeTree(tree, 1);
    setTree(updated);
    
    // 使用一次施肥机会
    HeartTreeManager.useFertilizeOpportunity();
    const newOps = HeartTreeManager.getFertilizeOpportunities();
    setFertilizeOpportunities(newOps);
    
    // 显示施肥文案
    const emotional = getRandomFertilizeMessage();
    showTreeMessage(`${emotional}\n（施肥成功，未来 7 天 EXP +30%）`);
    
    setTimeout(() => setIsFertilizing(false), 1000);
  };

  // 显示小树消息（统一 5 秒，防止被旧定时器提前打断）
  const showTreeMessage = (message: string) => {
    setCurrentMessage(message);
    setShowMessage(true);
    if (treeMessageTimerRef.current) {
      clearTimeout(treeMessageTimerRef.current);
      treeMessageTimerRef.current = null;
    }
    treeMessageTimerRef.current = setTimeout(() => {
      setShowMessage(false);
      treeMessageTimerRef.current = null;
    }, 5000);
  };

  // 点击树显示消息
  const handleTreeClick = () => {
    // 使用心树基础文案池（绿色文案框）
    showTreeMessage(getRandomHeartTreeMessage());
  };

  // 计算成长进度百分比
  const getGrowthProgress = () => {
    const current = tree.growthPoints;
    let progress = 0;
    
    if (tree.stage === 'seedling') {
      progress = (current / GROWTH_THRESHOLDS.sapling) * 100;
    } else if (tree.stage === 'sapling') {
      const stageProgress = current - GROWTH_THRESHOLDS.sapling;
      const stageTotal = GROWTH_THRESHOLDS.adult - GROWTH_THRESHOLDS.sapling;
      progress = (stageProgress / stageTotal) * 100;
    } else {
      progress = 100;
    }
    
    return Math.min(100, Math.max(0, progress));
  };

  // 渲染树的SVG（根据阶段和开花状态）- 改进版
  const renderTree = () => {
    // 使用精美 HeartTree 组件渲染（旧的多阶段 SVG 树代码保留在下面，暂未使用）
    const animState: 'idle' | 'watering' | 'fertilizing' =
      isWatering ? 'watering' : isFertilizing ? 'fertilizing' : 'idle';

    return (
      <div
        className="w-full h-auto max-w-md mx-auto cursor-pointer"
        onClick={handleTreeClick}
      >
        <BigHeartTree animState={animState} />
      </div>
    );

    // 幼苗阶段 - 使用新的幼苗SVG图标
    if (tree.stage === 'seedling') {
      return (
        <svg
          viewBox="0 0 200 200"
          className="w-full h-auto max-w-xs mx-auto cursor-pointer tree-svg tree-seedling"
          onClick={handleTreeClick}
          style={{ 
            filter: tree.bloomState === 'blooming' ? 'drop-shadow(0 0 15px rgba(255, 192, 203, 0.6))' : 'drop-shadow(2px 2px 4px rgba(0,0,0,0.1))',
            transition: 'all 1s ease-in-out'
          }}
        >
          <defs>
            {/* 叶子渐变 */}
            <linearGradient id="leafGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" style={{stopColor: '#66BB6A', stopOpacity: 1}} />
              <stop offset="100%" style={{stopColor: '#81C784', stopOpacity: 1}} />
            </linearGradient>
          </defs>
          
          {/* 幼苗图标组 */}
          <g id="Seedling" className={isWatering || isFertilizing ? 'animate-pulse' : ''}>
            {/* Y形树干 */}
            <path
              id="Trunk"
              d="M96,170 
                 L104,170 
                 C104,170 104,145 116,125 
                 L112,122 
                 C100,140 100,140 88,125 
                 L84,128 
                 C96,145 96,170 96,170 
                 Z"
              fill="#43A047"
            />
            
            {/* 左叶子 */}
            <path
              id="LeftLeaf"
              d="M86,126 
                 Q55,130 45,90 
                 Q75,80 86,126 
                 Z"
              fill="url(#leafGradient)"
              className="leaf leaf-1"
            />
            
            {/* 右叶子 */}
            <path
              id="RightLeaf"
              d="M114,123 
                 Q145,125 155,75 
                 Q115,70 114,123 
                 Z"
              fill="url(#leafGradient)"
              className="leaf leaf-2"
            />
          </g>
          
          {/* 花苞/开花效果 - 在叶子上添加 */}
          {tree.bloomState === 'budding' && (
            <g className="blossoms-budding">
              <circle cx="65" cy="108" r="3" fill="#FFB6C1" className="blossom-bud" />
              <circle cx="135" cy="99" r="3" fill="#FFB6C1" className="blossom-bud" />
            </g>
          )}
          
          {tree.bloomState === 'blooming' && (
            <g className="blossoms">
              <circle cx="65" cy="108" r="4" fill="#FFB6C1" className="blossom" />
              <circle cx="135" cy="99" r="4" fill="#FF69B4" className="blossom" />
            </g>
          )}
          
          {/* 浇水动画 - 在幼苗上方，避免与幼苗重叠 */}
          {isWatering && (
            <g className="water-drops">
              {[...Array(3)].map((_, i) => (
                <circle
                  key={i}
                  cx={100 + (i % 2 === 0 ? -8 : 8)}
                  cy={60 + i * 12}
                  r="3"
                  fill="#3b82f6"
                  className="water-drop"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </g>
          )}
          
          {/* 施肥动画 - 在幼苗周围，避免与幼苗重叠 */}
          {isFertilizing && (
            <g className="sparkles">
              {[...Array(4)].map((_, i) => {
                const angle = (i * 360) / 4;
                const rad = (angle * Math.PI) / 180;
                return (
                  <circle
                    key={i}
                    cx={100 + Math.cos(rad) * 25}
                    cy={120 + Math.sin(rad) * 25}
                    r="3"
                    fill="#84cc16"
                    className="sparkle"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                );
              })}
            </g>
          )}
        </svg>
      );
    }
    
    // 小树阶段
    if (tree.stage === 'sapling') {
      const treeHeight = 140;
      const topY = 230 - treeHeight;
      
      return (
        <svg
          viewBox="0 0 140 250"
          className="w-full h-auto max-w-xs mx-auto cursor-pointer tree-svg tree-sapling"
          onClick={handleTreeClick}
          style={{ 
            filter: tree.bloomState === 'blooming' ? 'drop-shadow(0 0 15px rgba(255, 192, 203, 0.6))' : 'drop-shadow(2px 2px 6px rgba(0,0,0,0.15))',
            transition: 'all 1s ease-in-out'
          }}
        >
          {/* 地面 */}
          <ellipse cx="70" cy="240" rx="110" ry="8" fill="#8B4513" opacity="0.3" />
          
          {/* 主干 */}
          <path
            d={`M70,240 Q75,${240 - treeHeight * 0.5} 70,${topY + 25} Q65,${topY + 20} 70,${topY + 10} Q75,${topY + 5} 70,${topY}`}
            stroke="#8B4513"
            strokeWidth="4"
            fill="none"
            className={isWatering || isFertilizing ? 'animate-pulse' : ''}
          />
          
          {/* 左侧分支 */}
          <path
            d={`M70,${topY + 25} Q45,${topY + 15} 40,${topY - 5} Q35,${topY - 15} 42,${topY - 20}`}
            stroke="#A0522D"
            strokeWidth="2.5"
            fill="none"
            className="branch"
          />
          
          {/* 右侧分支 */}
          <path
            d={`M70,${topY + 15} Q95,${topY + 10} 100,${topY - 10} Q105,${topY - 20} 98,${topY - 25}`}
            stroke="#A0522D"
            strokeWidth="2.5"
            fill="none"
            className="branch"
          />
          
          {/* 左侧叶子群组 */}
          <circle cx="42" cy={topY - 20} r="10" fill="#2E8B57" className="leaf leaf-1" />
          <circle cx="38" cy={topY - 30} r="8" fill="#3CB371" className="leaf leaf-2" />
          <circle cx="48" cy={topY - 25} r="7" fill="#90EE90" className="leaf leaf-3" />
          
          {/* 右侧叶子群组 */}
          <circle cx="98" cy={topY - 25} r="9" fill="#2E8B57" className="leaf leaf-4" />
          <circle cx="102" cy={topY - 35} r="8" fill="#3CB371" className="leaf leaf-5" />
          <circle cx="94" cy={topY - 30} r="7" fill="#90EE90" className="leaf leaf-6" />
          
          {/* 顶部叶子 */}
          <circle cx="70" cy={topY} r="8" fill="#32CD32" className="leaf leaf-7" />
          <circle cx="65" cy={topY - 8} r="6" fill="#98FB98" className="leaf leaf-8" />
          <circle cx="75" cy={topY - 8} r="6" fill="#90EE90" className="leaf leaf-9" />
          
          {/* 花苞/开花效果 */}
          {tree.bloomState === 'budding' && (
            <g className="blossoms-budding">
              <circle cx="42" cy={topY - 20} r="3" fill="#FFB6C1" className="blossom-bud" />
              <circle cx="98" cy={topY - 25} r="2.5" fill="#FFB6C1" className="blossom-bud" />
              <circle cx="70" cy={topY} r="2.5" fill="#FFB6C1" className="blossom-bud" />
            </g>
          )}
          
          {tree.bloomState === 'blooming' && (
            <g className="blossoms">
              <circle cx="42" cy={topY - 20} r="4" fill="#FFB6C1" className="blossom" />
              <circle cx="98" cy={topY - 25} r="3.5" fill="#FF69B4" className="blossom" />
              <circle cx="70" cy={topY} r="3.5" fill="#FF1493" className="blossom" />
              <circle cx="65" cy={topY - 8} r="3" fill="#FFB6C1" className="blossom" />
            </g>
          )}
          
          {/* 浇水/施肥动画 */}
          {isWatering && (
            <g className="water-drops">
              {[...Array(4)].map((_, i) => (
                <circle
                  key={i}
                  cx={70 + (i % 2 === 0 ? -5 : 5)}
                  cy={topY + 30 + Math.floor(i / 2) * 12}
                  r="3"
                  fill="#3b82f6"
                  className="water-drop"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </g>
          )}
          
          {isFertilizing && (
            <g className="sparkles">
              {[...Array(6)].map((_, i) => {
                const angle = (i * 360) / 6;
                const rad = (angle * Math.PI) / 180;
                return (
                  <circle
                    key={i}
                    cx={70 + Math.cos(rad) * 15}
                    cy={topY + 25 + Math.sin(rad) * 15}
                    r="3"
                    fill="#84cc16"
                    className="sparkle"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                );
              })}
            </g>
          )}
        </svg>
      );
    }
    
    // 成年树阶段
    const treeHeight = 190;
    const topY = 230 - treeHeight;
    
    return (
      <svg
        viewBox="0 0 200 250"
        className="w-full h-auto max-w-xs mx-auto cursor-pointer tree-svg tree-adult"
        onClick={handleTreeClick}
        style={{ 
          filter: tree.bloomState === 'blooming' ? 'drop-shadow(0 0 20px rgba(255, 192, 203, 0.7))' : 'drop-shadow(3px 3px 8px rgba(0,0,0,0.2))',
          transition: 'all 1s ease-in-out'
        }}
      >
        {/* 地面 */}
        <ellipse cx="100" cy="240" rx="120" ry="8" fill="#8B4513" opacity="0.3" />
        
        {/* 粗壮主干 */}
        <path
          d={`M100,240 Q110,${240 - treeHeight * 0.4} 100,${topY + 40} Q90,${topY + 30} 100,${topY + 20} Q110,${topY + 10} 100,${topY}`}
          stroke="#654321"
          strokeWidth="8"
          fill="none"
          className={isWatering || isFertilizing ? 'animate-pulse' : ''}
        />
        
        {/* 多个分支 */}
        <g className="branches">
          {/* 左侧大分支 */}
          <path
            d={`M100,${topY + 40} Q60,${topY + 30} 50,${topY + 5} Q40,${topY - 15} 55,${topY - 25}`}
            stroke="#8B4513"
            strokeWidth="3"
            fill="none"
            className="branch branch-1"
          />
          {/* 左侧小分支 */}
          <path
            d={`M100,${topY + 25} Q75,${topY + 15} 70,${topY - 10} Q65,${topY - 25} 75,${topY - 30}`}
            stroke="#A0522D"
            strokeWidth="2"
            fill="none"
            className="branch branch-2"
          />
          {/* 右侧大分支 */}
          <path
            d={`M100,${topY + 35} Q140,${topY + 25} 150,${topY} Q160,${topY - 20} 145,${topY - 30}`}
            stroke="#8B4513"
            strokeWidth="3"
            fill="none"
            className="branch branch-3"
          />
          {/* 右侧小分支 */}
          <path
            d={`M100,${topY + 20} Q125,${topY + 10} 130,${topY - 15} Q135,${topY - 30} 125,${topY - 35}`}
            stroke="#A0522D"
            strokeWidth="2"
            fill="none"
            className="branch branch-4"
          />
        </g>
        
        {/* 茂密树冠 - 使用椭圆创建更自然的树冠 */}
        <g className="canopy">
          {/* 左侧树冠群 */}
          <ellipse cx="70" cy={topY - 5} rx="28" ry="38" fill="#2E8B57" className="leaf-cluster cluster-1" />
          <ellipse cx="60" cy={topY - 25} rx="22" ry="28" fill="#3CB371" className="leaf-cluster cluster-2" />
          <ellipse cx="80" cy={topY - 35} rx="20" ry="25" fill="#90EE90" className="leaf-cluster cluster-3" />
          
          {/* 右侧树冠群 */}
          <ellipse cx="130" cy={topY - 10} rx="30" ry="35" fill="#2E8B57" className="leaf-cluster cluster-4" />
          <ellipse cx="140" cy={topY - 30} rx="25" ry="30" fill="#3CB371" className="leaf-cluster cluster-5" />
          <ellipse cx="120" cy={topY - 40} rx="18" ry="22" fill="#98FB98" className="leaf-cluster cluster-6" />
          
          {/* 顶部树冠 */}
          <ellipse cx="100" cy={topY - 50} rx="24" ry="28" fill="#32CD32" className="leaf-cluster cluster-7" />
          <ellipse cx="95" cy={topY - 60} rx="16" ry="20" fill="#90EE90" className="leaf-cluster cluster-8" />
        </g>
        
        {/* 花苞/开花效果 */}
        {tree.bloomState === 'budding' && (
          <g className="blossoms-budding">
            <circle cx="70" cy={topY - 5} r="4" fill="#FFB6C1" className="blossom-bud" />
            <circle cx="130" cy={topY - 10} r="3.5" fill="#FFB6C1" className="blossom-bud" />
            <circle cx="100" cy={topY - 50} r="3.5" fill="#FFB6C1" className="blossom-bud" />
            <circle cx="60" cy={topY - 25} r="3" fill="#FFB6C1" className="blossom-bud" />
            <circle cx="140" cy={topY - 30} r="3" fill="#FFB6C1" className="blossom-bud" />
          </g>
        )}
        
        {tree.bloomState === 'blooming' && (
          <g className="blossoms">
            <circle cx="70" cy={topY - 5} r="5" fill="#FFB6C1" className="blossom" />
            <circle cx="130" cy={topY - 10} r="4.5" fill="#FF69B4" className="blossom" />
            <circle cx="100" cy={topY - 50} r="4.5" fill="#FF1493" className="blossom" />
            <circle cx="60" cy={topY - 25} r="4" fill="#FFB6C1" className="blossom" />
            <circle cx="140" cy={topY - 30} r="4" fill="#FF69B4" className="blossom" />
            <circle cx="80" cy={topY - 35} r="3.5" fill="#FF1493" className="blossom" />
            <circle cx="120" cy={topY - 40} r="3.5" fill="#FFB6C1" className="blossom" />
            <circle cx="95" cy={topY - 60} r="3" fill="#FF69B4" className="blossom" />
          </g>
        )}
        
        {/* 浇水/施肥动画 */}
        {isWatering && (
          <g className="water-drops">
            {[...Array(5)].map((_, i) => (
              <circle
                key={i}
                cx={100 + (i % 2 === 0 ? -8 : 8) * (i > 2 ? 1 : -1)}
                cy={topY + 45 + Math.floor(i / 2) * 10}
                r="3.5"
                fill="#3b82f6"
                className="water-drop"
                style={{ animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </g>
        )}
        
        {isFertilizing && (
          <g className="sparkles">
            {[...Array(8)].map((_, i) => {
              const angle = (i * 360) / 8;
              const rad = (angle * Math.PI) / 180;
              return (
                <circle
                  key={i}
                  cx={100 + Math.cos(rad) * 18}
                  cy={topY + 40 + Math.sin(rad) * 18}
                  r="3.5"
                  fill="#84cc16"
                  className="sparkle"
                  style={{ animationDelay: `${i * 0.08}s` }}
                />
              );
            })}
          </g>
        )}
      </svg>
    );
  };

  // 获取阶段名称
  const getStageName = () => {
    switch (tree.stage) {
      case 'seedling': return '幼苗';
      case 'sapling': return '小树';
      case 'adult': return '成年树';
      default: return '幼苗';
    }
  };

  // 获取开花状态名称
  const getBloomStateName = () => {
    switch (tree.bloomState) {
      case 'none': return '';
      case 'budding': return '含苞待放';
      case 'blooming': return '花团锦簇';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-cyan-50 pb-20">
      <div className="p-6 pt-4">
        {/* 头部信息（按需求去除文案） */}
        <div className="mb-0 text-center" />

        {/* 树名 + 等级 & EXP 卡片（精简版） */}
        {(() => {
          const levelView = getHeartTreeLevelView(expState);
          const hasBuff = getFertilizerMultiplier(expState) > 1;
          return (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 mb-6 shadow-md border border-teal-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🌳</div>
                  <div>
                    <p className="text-sm font-semibold text-teal-700 mb-0.5">
                      {typeof window !== 'undefined'
                        ? (window.localStorage.getItem('heartTreeNameV1') || '心树')
                        : '心树'}
                    </p>
                    <p className="text-xs text-gray-500">Lv.{levelView.level}</p>
                  </div>
                </div>
                {hasBuff && (
                  <div className="px-3 py-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full text-white text-xs font-semibold shadow-sm">
                    ⚡ 经验加速中
                  </div>
                )}
              </div>

              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">下一等级</span>
                  <span className="font-semibold text-gray-900">
                    {levelView.currentExp} / {Number.isFinite(levelView.expToNext) ? levelView.expToNext : 'MAX'} EXP
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-teal-400 via-teal-500 to-green-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${levelView.progress}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })()}

        {/* 树容器 */}
        <div className="relative mb-6 flex items-center justify-center min-h-[320px]">
        {/* 落花效果（静止在小树旁） */}
        {flowers.map(flower => (
          <div
            key={flower.id}
            className="absolute text-3xl pointer-events-none z-10 animate-fade-in-float"
            style={{
              left: `${flower.x}%`,
              top: `${flower.y}%`,
            }}
          >
            🌸
            {flower.content && (
              <div className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-2xl text-sm whitespace-nowrap text-gray-800 border-2 border-pink-200 animate-fade-in">
                {flower.content}
              </div>
            )}
          </div>
        ))}
          
          {/* 树 */}
          <div className="relative z-0 w-full max-w-lg">
            {renderTree()}
          </div>
        </div>

        {/* 小树消息（绿色渐变文案框） */}
        {showMessage && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-xs animate-slide-down pointer-events-none">
            <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-green-100 border border-emerald-200 rounded-2xl p-4 shadow-2xl">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🌳</span>
                <p className="text-sm text-emerald-900 leading-relaxed whitespace-pre-line">
                  {currentMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex flex-row gap-3">
          {/* 浇水按钮 */}
          <button
            onClick={handleWater}
            disabled={waterOpportunities <= 0 || isWatering}
            className={`flex-1 px-6 py-4 rounded-2xl font-semibold text-white transition-all shadow-lg ${
              waterOpportunities > 0 && !isWatering
                ? 'bg-gradient-to-r from-blue-400 to-cyan-500 hover:from-blue-500 hover:to-cyan-600 active:scale-95'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">💧</span>
              <div className="text-left">
                <div>浇水</div>
                <div className="text-xs opacity-90">
                  可用：{waterOpportunities}
                </div>
              </div>
            </div>
          </button>

          {/* 施肥按钮 */}
          <button
            onClick={handleFertilize}
            disabled={fertilizeOpportunities <= 0 || isFertilizing}
            className={`flex-1 px-6 py-4 rounded-2xl font-semibold text-white transition-all shadow-lg ${
              fertilizeOpportunities > 0 && !isFertilizing
                ? 'bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 active:scale-95'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">🌱</span>
              <div className="text-left">
                <div>施肥</div>
                <div className="text-xs opacity-90">
                  可用：{fertilizeOpportunities}
                </div>
              </div>
            </div>
          </button>
        </div>


        {/* CSS 动画 */}
        <style jsx>{`
          /* 树容器动画 */
          .tree-svg {
            transition: all 1s ease-in-out;
          }
          
          .tree-seedling {
            transform: scale(0.85);
            opacity: 0.9;
          }
          
          .tree-sapling {
            transform: scale(0.95);
            opacity: 0.95;
          }
          
          .tree-adult {
            transform: scale(1);
            opacity: 1;
          }
          
          /* 叶子微动效果 */
          .leaf, .leaf-cluster {
            animation: leafSway 4s ease-in-out infinite alternate;
            transform-origin: center;
          }
          
          .leaf-1 { animation-delay: 0s; }
          .leaf-2 { animation-delay: 0.5s; }
          .leaf-3 { animation-delay: 1s; }
          .leaf-4 { animation-delay: 0.3s; }
          .leaf-5 { animation-delay: 0.8s; }
          .leaf-6 { animation-delay: 1.3s; }
          .leaf-7 { animation-delay: 0.2s; }
          .leaf-8 { animation-delay: 0.7s; }
          .leaf-9 { animation-delay: 1.2s; }
          
          .cluster-1 { animation-delay: 0s; }
          .cluster-2 { animation-delay: 0.4s; }
          .cluster-3 { animation-delay: 0.8s; }
          .cluster-4 { animation-delay: 0.2s; }
          .cluster-5 { animation-delay: 0.6s; }
          .cluster-6 { animation-delay: 1s; }
          .cluster-7 { animation-delay: 0.3s; }
          .cluster-8 { animation-delay: 0.7s; }
          
          @keyframes leafSway {
            0% { 
              transform: rotate(-2deg) scale(1); 
            }
            100% { 
              transform: rotate(2deg) scale(1.03); 
            }
          }
          
          /* 开花动画 */
          .blossom-bud {
            animation: budGlow 2s ease-in-out infinite alternate;
          }
          
          .blossom {
            animation: blossomGlow 2.5s ease-in-out infinite alternate;
            opacity: 0;
          }
          
          .blossoms .blossom:nth-child(1) { animation-delay: 0s; opacity: 1; }
          .blossoms .blossom:nth-child(2) { animation-delay: 0.3s; opacity: 1; }
          .blossoms .blossom:nth-child(3) { animation-delay: 0.6s; opacity: 1; }
          .blossoms .blossom:nth-child(4) { animation-delay: 0.9s; opacity: 1; }
          .blossoms .blossom:nth-child(5) { animation-delay: 1.2s; opacity: 1; }
          .blossoms .blossom:nth-child(6) { animation-delay: 1.5s; opacity: 1; }
          .blossoms .blossom:nth-child(7) { animation-delay: 1.8s; opacity: 1; }
          .blossoms .blossom:nth-child(8) { animation-delay: 2.1s; opacity: 1; }
          
          @keyframes budGlow {
            0% { 
              transform: scale(1);
              opacity: 0.7;
            }
            100% { 
              transform: scale(1.15);
              opacity: 1;
            }
          }
          
          @keyframes blossomGlow {
            0% { 
              transform: scale(1);
              opacity: 0.8;
            }
            100% { 
              transform: scale(1.25);
              opacity: 1;
            }
          }
          
          /* 水滴动画 */
          .water-drop {
            animation: waterDrop 1.5s ease-in forwards;
          }
          
          @keyframes waterDrop {
            0% { 
              transform: translateY(-15px) scale(0.5);
              opacity: 0;
            }
            30% { 
              transform: translateY(0) scale(1);
              opacity: 1;
            }
            100% { 
              transform: translateY(40px) scale(0.3);
              opacity: 0;
            }
          }
          
          /* 肥料粒子动画 */
          .sparkle {
            animation: sparkleFloat 2s ease-out forwards;
          }
          
          @keyframes sparkleFloat {
            0% { 
              transform: translateY(0) rotate(0deg) scale(0.5);
              opacity: 0;
            }
            20% { 
              transform: translateY(-8px) rotate(90deg) scale(1);
              opacity: 1;
            }
            80% { 
              transform: translateY(-25px) rotate(270deg) scale(0.8);
              opacity: 0.6;
            }
            100% { 
              transform: translateY(-40px) rotate(360deg) scale(0.3);
              opacity: 0;
            }
          }
          
          /* 消息动画 */
          @keyframes slide-down {
            0% {
              transform: translate(-50%, -20px);
              opacity: 0;
            }
            100% {
              transform: translate(-50%, 0);
              opacity: 1;
            }
          }
          
          @keyframes fade-in {
            0% {
              opacity: 0;
            }
            100% {
              opacity: 1;
            }
          }
          
          @keyframes fade-in-float {
            0% {
              opacity: 0;
              transform: translateY(-10px) scale(0.8);
            }
            50% {
              transform: translateY(-5px) scale(1);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          
          .animate-slide-down {
            animation: slide-down 0.3s ease-out;
          }
          
          .animate-fade-in {
            animation: fade-in 0.5s ease-in;
          }
          
          .animate-fade-in-float {
            animation: fade-in-float 0.6s ease-out forwards;
          }
        `}</style>
      </div>
    </div>
  );
}

