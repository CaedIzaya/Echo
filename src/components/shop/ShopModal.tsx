import { useState, useEffect, useRef } from 'react';
import { ShopItem } from '~/pages/api/shop/items';
import { getCurrentTheme, setTheme, ThemeType } from '~/lib/themeSystem';
import { trackEvent } from '~/lib/analytics';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShopModal({ isOpen, onClose }: ShopModalProps) {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [fruits, setFruits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('default');
  const backgroundSectionRef = useRef<HTMLDivElement | null>(null);
  const badgeSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      trackEvent({
        name: 'shop_open',
        feature: 'shop',
        page: '/dashboard',
        action: 'open',
      });
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 重新加载当前主题
      const current = getCurrentTheme();
      console.log('[ShopModal] 加载时的主题:', current);
      setCurrentTheme(current);
      
      const [itemsRes, fruitsRes] = await Promise.all([
        fetch('/api/shop/items'),
        fetch('/api/user/fruits'),
      ]);

      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setItems(itemsData);
      }

      if (fruitsRes.ok) {
        const fruitsData = await fruitsRes.json();
        setFruits(fruitsData.fruits || 0);
      }
    } catch (error) {
      console.error('加载商城数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToSection = (section: 'background' | 'badge') => {
    const target = section === 'background' ? backgroundSectionRef.current : badgeSectionRef.current;
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const getThemePreview = (itemId: string) => {
    switch (itemId) {
      case 'theme_echo':
        return { gradient: 'linear-gradient(135deg, rgba(20, 184, 166, 0.25), rgba(6, 182, 212, 0.2), rgba(14, 116, 144, 0.25))' };
      case 'theme_salt_blue':
        return { gradient: 'linear-gradient(135deg, rgba(224, 242, 254, 0.6), rgba(186, 230, 253, 0.5), rgba(125, 211, 252, 0.4))' };
      case 'theme_fresh_green':
        return { gradient: 'linear-gradient(135deg, rgba(220, 252, 231, 0.6), rgba(167, 243, 208, 0.5), rgba(134, 239, 172, 0.4))' };
      case 'theme_spring':
        return { gradient: 'linear-gradient(135deg, rgba(255, 228, 214, 0.5), rgba(253, 186, 116, 0.35), rgba(34, 197, 94, 0.25), rgba(167, 243, 208, 0.5), rgba(236, 253, 245, 0.7))', effect: 'spring' as const };
      case 'theme_summer':
        return { gradient: 'linear-gradient(135deg, rgba(255, 255, 255, 0.6), rgba(186, 230, 253, 0.6), rgba(94, 234, 212, 0.55), rgba(56, 189, 248, 0.55), rgba(186, 230, 253, 0.8))', effect: 'summer' as const };
      case 'theme_autumn':
        return { gradient: 'linear-gradient(135deg, rgba(255, 228, 214, 0.5), rgba(251, 146, 60, 0.35), rgba(234, 88, 12, 0.35), rgba(251, 146, 60, 0.45), rgba(254, 215, 170, 0.7))', effect: 'autumn' as const };
      case 'theme_winter':
        return { gradient: 'linear-gradient(135deg, rgba(8, 47, 73, 0.55), rgba(253, 230, 138, 0.45), rgba(254, 243, 199, 0.6))', effect: 'winter' as const };
      default:
        return null;
    }
  };

  const handlePurchase = async (item: ShopItem) => {
    if (item.purchased) {
      alert('您已拥有该商品');
      return;
    }

    if (fruits < item.price) {
      alert('果实不足，继续努力升级心树吧！');
      return;
    }

    if (!confirm(`确认花费 ${item.price} 个果实购买「${item.name}」吗？`)) {
      return;
    }

    try {
      setPurchasing(item.id);
      const res = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: item.id,
          itemType: item.type,
          price: item.price,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setFruits(data.fruits);
        
        // 更新商品列表
        setItems(prev => prev.map(i => 
          i.id === item.id ? { ...i, purchased: true } : i
        ));

        alert('购买成功！');
        
        // 如果购买的是主题，刷新当前主题状态
        if (item.type === 'theme') {
          setCurrentTheme(getCurrentTheme());
        }
        
        // 🔄 如果购买的是勋章，刷新邮件系统（勋章购买会触发特殊邮件）
        if (item.type === 'badge') {
          console.log('[ShopModal] 📧 检测到购买勋章，刷新邮件系统');
          try {
            const { MailSystem } = await import('~/lib/MailSystem');
            await MailSystem.getInstance().refresh();
          } catch (error) {
            console.error('[ShopModal] 邮件刷新失败:', error);
          }
        }
      } else {
        const error = await res.json();
        alert(error.error || '购买失败');
      }
    } catch (error) {
      console.error('购买失败:', error);
      alert('购买失败，请稍后重试');
    } finally {
      setPurchasing(null);
    }
  };

  const handleSetTheme = (themeId: ThemeType) => {
    console.log('[ShopModal] 设置主题:', themeId);
    setTheme(themeId);
    
    // 先关闭弹窗
    onClose();
    
    // 延迟刷新，让弹窗关闭动画完成
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  if (!isOpen) return null;

  const backgroundItems = items.filter(item => item.type === 'theme');
  const badgeItems = items.filter(item => item.type === 'badge');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏪</span>
              <h2 className="text-2xl font-bold">心树商城</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <span className="text-xl">✕</span>
            </button>
          </div>
          
          {/* 果实余额 */}
          <div className="mt-4 flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2 backdrop-blur-sm">
            <span className="text-2xl">🍎</span>
            <span className="text-lg font-semibold">我的果实：</span>
            <span className="text-2xl font-bold">{fruits}</span>
          </div>
        </div>

        {/* 商品列表 */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
          ) : (
            <>
              {/* 模块导航 */}
              <div className="flex items-center gap-3 mb-5">
                <button
                  onClick={() => scrollToSection('background')}
                  className="px-4 py-2 rounded-full text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                >
                  背景
                </button>
                <button
                  onClick={() => scrollToSection('badge')}
                  className="px-4 py-2 rounded-full text-sm font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition"
                >
                  勋章
                </button>
              </div>

              {/* 背景主题 */}
              <div ref={backgroundSectionRef} className="mb-8">
                <div className="text-sm font-semibold text-slate-700 mb-3">背景主题</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {backgroundItems.map(item => {
                    const preview = getThemePreview(item.id);
                    const isTheme = item.type === 'theme';
                    return (
                      <div
                        key={item.id}
                        className={`relative rounded-2xl p-5 border-2 transition-all duration-300 overflow-hidden ${
                          item.purchased
                            ? 'bg-white/80 border-gray-200'
                            : isTheme
                            ? 'border-emerald-200 hover:shadow-lg hover:scale-[1.02]'
                            : 'bg-gradient-to-br from-white to-amber-50 border-amber-300 hover:shadow-lg hover:scale-[1.02]'
                        }`}
                      >
                        {/* 背景预览 */}
                        {preview && (
                          <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute inset-0" style={{ background: preview.gradient }} />
                            {preview.effect && (
                              <div className={`season-layer season-${preview.effect}`}>
                                {Array.from({ length: 6 }).map((_, index) => (
                                  <span
                                    key={index}
                                    className="particle"
                                    style={{
                                      left: `${10 + index * 14}%`,
                                      width: `${6 + (index % 3) * 2}px`,
                                      height: `${8 + (index % 3) * 3}px`,
                                      animationDelay: `${index * 0.6}s`,
                                      animationDuration: `${6 + index * 0.6}s`,
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 已购买标记 */}
                        {item.purchased && (
                          <div className="absolute top-3 right-3 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold z-10">
                            已拥有
                          </div>
                        )}

                        <div className="relative z-10">
                          {/* 商品图标 */}
                          <div className="text-5xl mb-3 text-center">{item.icon}</div>

                          {/* 商品信息 */}
                          <h3 className="text-lg font-bold text-gray-800 mb-2 text-center">
                            {item.name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-4 text-center min-h-[40px]">
                            {item.description}
                          </p>

                          {/* 价格和购买按钮 */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <span className="text-xl">🍎</span>
                              <span className="text-lg font-bold text-amber-600">
                                {item.price}
                              </span>
                            </div>
                            <button
                              onClick={() => handlePurchase(item)}
                              disabled={item.purchased || purchasing === item.id}
                              className={`px-4 py-2 rounded-xl font-semibold transition-all duration-300 ${
                                item.purchased
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : fruits >= item.price
                                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-md hover:shadow-lg'
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              {purchasing === item.id ? (
                                <span className="inline-block animate-spin">⏳</span>
                              ) : item.purchased ? (
                                '已拥有'
                              ) : fruits >= item.price ? (
                                '购买'
                              ) : (
                                '果实不足'
                              )}
                            </button>
                          </div>

                          {/* 主题设置按钮（仅主题类商品且已购买时显示） */}
                          {item.type === 'theme' && item.purchased && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              {(() => {
                                const themeId = item.id.replace('theme_', '') as ThemeType;
                                const isCurrentTheme = currentTheme === themeId;
                                
                                if (isCurrentTheme) {
                                  return (
                                    <button
                                      onClick={() => handleSetTheme('default')}
                                      className="w-full px-4 py-2 rounded-xl bg-gray-500 text-white font-semibold hover:bg-gray-600 transition-all duration-300"
                                    >
                                      还原默认主题
                                    </button>
                                  );
                                } else {
                                  return (
                                    <button
                                      onClick={() => handleSetTheme(themeId)}
                                      className="w-full px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold hover:from-teal-600 hover:to-cyan-600 transition-all duration-300"
                                    >
                                      设置主题
                                    </button>
                                  );
                                }
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 勋章 */}
              <div ref={badgeSectionRef}>
                <div className="text-sm font-semibold text-slate-700 mb-3">勋章</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {badgeItems.map(item => (
                    <div
                      key={item.id}
                      className={`relative rounded-2xl p-5 border-2 transition-all duration-300 ${
                        item.purchased
                          ? 'bg-gray-50 border-gray-300'
                          : 'bg-gradient-to-br from-white to-amber-50 border-amber-300 hover:shadow-lg hover:scale-[1.02]'
                      }`}
                    >
                      {/* 已购买标记 */}
                      {item.purchased && (
                        <div className="absolute top-3 right-3 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                          已拥有
                        </div>
                      )}

                      {/* 商品图标 */}
                      <div className="text-5xl mb-3 text-center">{item.icon}</div>

                      {/* 商品信息 */}
                      <h3 className="text-lg font-bold text-gray-800 mb-2 text-center">
                        {item.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4 text-center min-h-[40px]">
                        {item.description}
                      </p>

                      {/* 价格和购买按钮 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className="text-xl">🍎</span>
                          <span className="text-lg font-bold text-amber-600">
                            {item.price}
                          </span>
                        </div>
                        <button
                          onClick={() => handlePurchase(item)}
                          disabled={item.purchased || purchasing === item.id}
                          className={`px-4 py-2 rounded-xl font-semibold transition-all duration-300 ${
                            item.purchased
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : fruits >= item.price
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-md hover:shadow-lg'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {purchasing === item.id ? (
                            <span className="inline-block animate-spin">⏳</span>
                          ) : item.purchased ? (
                            '已拥有'
                          ) : fruits >= item.price ? (
                            '购买'
                          ) : (
                            '果实不足'
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 提示信息 */}
          <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-200">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-800 mb-1">如何获得果实？</h4>
                <p className="text-sm text-gray-600">
                  心树每升 5 级可获得 1 个果实。持续专注，让心树茁壮成长吧！
                </p>
              </div>
            </div>
          </div>

          <style jsx>{`
            .season-layer {
              position: absolute;
              inset: 0;
              overflow: hidden;
              pointer-events: none;
            }
            .season-layer .particle {
              position: absolute;
              top: -10%;
              opacity: 0.8;
              animation-timing-function: linear;
              animation-iteration-count: infinite;
            }
            .season-spring .particle {
              background: rgba(132, 204, 22, 0.85);
              border-radius: 4px 10px 4px 10px;
              animation-name: fall-leaf;
            }
            .season-autumn .particle {
              background: rgba(249, 115, 22, 0.85);
              border-radius: 6px 12px 6px 12px;
              animation-name: fall-leaf;
            }
            .season-winter .particle {
              background: rgba(255, 255, 255, 0.9);
              border-radius: 999px;
              animation-name: snow-fall;
            }
            .season-summer .particle {
              border: 1px solid rgba(125, 211, 252, 0.8);
              border-radius: 999px;
              background: rgba(186, 230, 253, 0.2);
              animation-name: bubble-rise;
            }

            @keyframes fall-leaf {
              0% { transform: translateY(-10%) rotate(0deg); opacity: 0; }
              15% { opacity: 0.8; }
              100% { transform: translateY(120%) rotate(140deg); opacity: 0; }
            }

            @keyframes snow-fall {
              0% { transform: translateY(-10%) translateX(0); opacity: 0; }
              20% { opacity: 0.9; }
              100% { transform: translateY(120%) translateX(10px); opacity: 0; }
            }

            @keyframes bubble-rise {
              0% { transform: translateY(120%) scale(0.7); opacity: 0; }
              20% { opacity: 0.6; }
              100% { transform: translateY(-20%) scale(1); opacity: 0; }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}



