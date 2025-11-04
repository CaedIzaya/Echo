import React, { useState, useEffect, useCallback } from 'react';
import {
  HeartTreeManager,
  HeartTree,
  GROWTH_THRESHOLDS
} from './HeartTreeSystem';

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
  const [showMessage, setShowMessage] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [flowers, setFlowers] = useState<Array<{ id: number; x: number; y: number; content?: string }>>([]);
  const [isWatering, setIsWatering] = useState(false);
  const [isFertilizing, setIsFertilizing] = useState(false);
  const [waterOpportunities, setWaterOpportunities] = useState(props.completedMilestonesToday || 0);
  const [fertilizeOpportunities, setFertilizeOpportunities] = useState(props.newAchievementsToday || 0);
  const flowerIdRef = React.useRef(0);

  // 加载心树数据
  useEffect(() => {
    const loadedTree = HeartTreeManager.getTree();
    setTree(loadedTree);
    
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
    if (waterOpportunities <= 0) return;
    
    setIsWatering(true);
    const updated = HeartTreeManager.waterTree(tree, 1);
    setTree(updated);
    
    // 使用一次浇水机会
    HeartTreeManager.useWaterOpportunity();
    const newOps = HeartTreeManager.getWaterOpportunities();
    setWaterOpportunities(newOps);
    
    // 显示消息
    showTreeMessage(HeartTreeManager.getRandomMessage(updated));
    
    setTimeout(() => setIsWatering(false), 1000);
  };

  // 施肥
  const handleFertilize = () => {
    if (fertilizeOpportunities <= 0) return;
    
    setIsFertilizing(true);
    const updated = HeartTreeManager.fertilizeTree(tree, 1);
    setTree(updated);
    
    // 使用一次施肥机会
    HeartTreeManager.useFertilizeOpportunity();
    const newOps = HeartTreeManager.getFertilizeOpportunities();
    setFertilizeOpportunities(newOps);
    
    // 显示消息
    showTreeMessage(HeartTreeManager.getRandomMessage(updated));
    
    setTimeout(() => setIsFertilizing(false), 1000);
  };

  // 显示小树消息
  const showTreeMessage = (message: string) => {
    setCurrentMessage(message);
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 4000);
  };

  // 点击树显示消息
  const handleTreeClick = () => {
    showTreeMessage(HeartTreeManager.getRandomMessage(tree));
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
    // 幼苗阶段
    if (tree.stage === 'seedling') {
      const treeHeight = 90;
      const topY = 230 - treeHeight;
      
      return (
        <svg
          viewBox="0 0 120 250"
          className="w-full h-auto max-w-xs mx-auto cursor-pointer tree-svg tree-seedling"
          onClick={handleTreeClick}
          style={{ 
            filter: tree.bloomState === 'blooming' ? 'drop-shadow(0 0 15px rgba(255, 192, 203, 0.6))' : 'drop-shadow(2px 2px 4px rgba(0,0,0,0.1))',
            transition: 'all 1s ease-in-out'
          }}
        >
          {/* 地面 */}
          <ellipse cx="60" cy="240" rx="100" ry="8" fill="#8B4513" opacity="0.3" />
          
          {/* 主干 - 使用path让主干更自然 */}
          <path
            d={`M60,240 Q65,${240 - treeHeight * 0.6} 60,${topY + 15} Q55,${topY + 10} 60,${topY}`}
            stroke="#8B4513"
            strokeWidth="3"
            fill="none"
            className={isWatering || isFertilizing ? 'animate-pulse' : ''}
          />
          
          {/* 三片小叶子 - 不同大小和颜色 */}
          <circle cx="50" cy={topY + 20} r="8" fill="#2E8B57" className="leaf leaf-1" />
          <circle cx="70" cy={topY + 10} r="6" fill="#3CB371" className="leaf leaf-2" />
          <circle cx="55" cy={topY + 5} r="5" fill="#90EE90" className="leaf leaf-3" />
          
          {/* 花苞/开花效果 */}
          {tree.bloomState === 'budding' && (
            <circle cx="50" cy={topY + 20} r="3" fill="#FFB6C1" className="blossom-bud" />
          )}
          
          {tree.bloomState === 'blooming' && (
            <g className="blossoms">
              <circle cx="50" cy={topY + 20} r="4" fill="#FFB6C1" className="blossom" />
              <circle cx="70" cy={topY + 10} r="3.5" fill="#FF69B4" className="blossom" />
              <circle cx="55" cy={topY + 5} r="3" fill="#FF1493" className="blossom" />
            </g>
          )}
          
          {/* 浇水/施肥动画 */}
          {isWatering && (
            <g className="water-drops">
              {[...Array(3)].map((_, i) => (
                <circle
                  key={i}
                  cx={60}
                  cy={topY + 30 + i * 12}
                  r="3"
                  fill="#3b82f6"
                  className="water-drop"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </g>
          )}
          
          {isFertilizing && (
            <g className="sparkles">
              {[...Array(4)].map((_, i) => {
                const angle = (i * 360) / 4;
                const rad = (angle * Math.PI) / 180;
                return (
                  <circle
                    key={i}
                    cx={60 + Math.cos(rad) * 12}
                    cy={topY + 25 + Math.sin(rad) * 12}
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
      <div className="p-6 pt-20">
        {/* 头部信息 */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🌳 心树回忆</h1>
          <p className="text-gray-600">你的专注让心树茁壮成长</p>
        </div>

        {/* 成长信息卡片 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 mb-6 shadow-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">成长阶段</p>
              <p className="text-lg font-bold text-gray-900">{getStageName()}</p>
              {getBloomStateName() && (
                <p className="text-xs text-pink-500 mt-1">🌸 {getBloomStateName()}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">成长值</p>
              <p className="text-lg font-bold text-teal-600">{tree.growthPoints}</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div
                  className="bg-gradient-to-r from-teal-400 to-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${getGrowthProgress()}%` }}
                />
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">等级</p>
              <p className="text-lg font-bold text-indigo-600">LV.{tree.level}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">明日加成</p>
              <p className="text-lg font-bold text-yellow-600">+{tree.growthBoost}%</p>
            </div>
          </div>
        </div>

        {/* 树容器 */}
        <div className="relative mb-6 flex items-center justify-center min-h-[300px]">
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
          <div className="relative z-0">
            {renderTree()}
          </div>
        </div>

        {/* 小树消息 */}
        {showMessage && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl p-4 shadow-2xl z-50 max-w-xs animate-slide-down">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🌳</span>
              <p className="text-sm text-gray-800 leading-relaxed">{currentMessage}</p>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="space-y-3">
          {/* 浇水按钮 */}
          <button
            onClick={handleWater}
            disabled={waterOpportunities <= 0 || isWatering}
            className={`w-full px-6 py-4 rounded-2xl font-semibold text-white transition-all shadow-lg ${
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
                  {waterOpportunities > 0 ? `还有 ${waterOpportunities} 次机会` : '今日已用完'}
                </div>
              </div>
            </div>
          </button>

          {/* 施肥按钮 */}
          <button
            onClick={handleFertilize}
            disabled={fertilizeOpportunities <= 0 || isFertilizing}
            className={`w-full px-6 py-4 rounded-2xl font-semibold text-white transition-all shadow-lg ${
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
                  {fertilizeOpportunities > 0 ? `还有 ${fertilizeOpportunities} 次机会` : '今日已用完'}
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* 统计信息 */}
        <div className="mt-6 bg-white/60 backdrop-blur-sm rounded-xl p-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500 mb-1">总浇水次数</p>
              <p className="text-lg font-bold text-blue-600">{tree.totalWatered}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">总施肥次数</p>
              <p className="text-lg font-bold text-green-600">{tree.totalFertilized}</p>
            </div>
          </div>
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

