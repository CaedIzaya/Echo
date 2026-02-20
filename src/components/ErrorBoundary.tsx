import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  renderCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private renderCountInterval: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      renderCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    console.error('[ErrorBoundary] 捕获到错误:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] 错误详情:', {
      error: error.toString(),
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      error,
      errorInfo,
    });

    // 检测无限循环
    this.setState(prev => ({ renderCount: prev.renderCount + 1 }));

    if (!this.renderCountInterval) {
      this.renderCountInterval = setInterval(() => {
        if (this.state.renderCount > 50) {
          console.error('[ErrorBoundary] 🚨 检测到无限循环! 已渲染', this.state.renderCount, '次');
          console.error('[ErrorBoundary] 错误信息:', this.state.error?.message);
          console.error('[ErrorBoundary] 组件堆栈:', this.state.errorInfo?.componentStack);
          
          if (typeof window !== 'undefined') {
            // ⚠️ 自动清缓存 + 刷新会让问题更随机、难排查，先关闭自动行为，保留手动按钮
            console.warn('[ErrorBoundary] 检测到高频错误渲染，但已禁用自动清缓存/刷新。请手动操作。');
          }
          
        }
      }, 1000);
    }
  }

  componentWillUnmount() {
    if (this.renderCountInterval) {
      clearInterval(this.renderCountInterval);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div
            style={{
              padding: '40px 20px',
              maxWidth: '800px',
              margin: '0 auto',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            <div
              style={{
                background: '#fee',
                border: '2px solid #f33',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '20px',
              }}
            >
              <h2 style={{ color: '#c00', margin: '0 0 10px 0' }}>
                ⚠️ 应用错误
              </h2>
              <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>
                应用遇到了一个错误。请尝试刷新页面或清除缓存。
              </p>
              {this.state.renderCount > 50 && (
                <p style={{ margin: '10px 0', fontSize: '14px', color: '#c00', fontWeight: 'bold' }}>
                  🚨 检测到无限循环（已渲染 {this.state.renderCount} 次）
                </p>
              )}
            </div>

            <div
              style={{
                background: '#f5f5f5',
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '20px',
              }}
            >
              <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>错误信息：</h3>
              <pre
                style={{
                  background: '#fff',
                  padding: '10px',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '12px',
                  margin: '0',
                }}
              >
                {this.state.error?.toString()}
              </pre>

              {this.state.errorInfo?.componentStack && (
                <>
                  <h3 style={{ margin: '20px 0 10px 0', fontSize: '16px' }}>组件堆栈：</h3>
                  <pre
                    style={{
                      background: '#fff',
                      padding: '10px',
                      borderRadius: '4px',
                      overflow: 'auto',
                      fontSize: '12px',
                      margin: '0',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {this.state.errorInfo.componentStack}
                  </pre>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '12px 24px',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                🔄 刷新页面
              </button>

              <button
                //</div>onClick={() => {
                  //localStorage.clear();
                  //window.location.reload();
                //}}
                style={{
                  padding: '12px 24px',
                  background: '#ff9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                🗑️ 清除缓存并刷新
              </button>

              <button
                onClick={() => {
                  this.setState({
                    hasError: false,
                    error: null,
                    errorInfo: null,
                    renderCount: 0,
                  });
                }}
                style={{
                  padding: '12px 24px',
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                🔁 尝试恢复
              </button>
            </div>

            <div
              style={{
                marginTop: '20px',
                padding: '15px',
                background: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#856404',
              }}
            >
              <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>
                💡 建议操作：
              </p>
              <ol style={{ margin: '0', paddingLeft: '20px' }}>
                <li>点击"清除缓存并刷新"</li>
                <li>如果问题持续，请联系技术支持</li>
                <li>提供控制台的完整错误日志</li>
              </ol>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}











