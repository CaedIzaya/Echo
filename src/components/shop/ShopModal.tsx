import { useState, useEffect } from 'react';
import { ShopItem } from '~/pages/api/shop/items';
import { getCurrentTheme, setTheme } from '~/lib/themeSystem';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShopModal({ isOpen, onClose }: ShopModalProps) {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [fruits, setFruits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<'default' | 'echo' | 'salt_blue' | 'fresh_green'>('default');

  useEffect(() => {
    if (isOpen) {
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

  const handleSetTheme = (themeId: 'default' | 'echo' | 'salt_blue' | 'fresh_green') => {
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {items.map(item => (
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

                  {/* 主题设置按钮（仅主题类商品且已购买时显示） */}
                  {item.type === 'theme' && item.purchased && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      {(() => {
                        const themeId = item.id.replace('theme_', '') as 'echo' | 'salt_blue' | 'fresh_green';
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
              ))}
            </div>
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
        </div>
      </div>
    </div>
  );
}




