import { useState, useEffect } from 'react';

interface Comment {
  id: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export default function CommentsPage() {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch comments on component mount
  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    try {
      const response = await fetch('/api/comments/list');
      const data = await response.json();
      
      if (response.ok && data.success) {
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('获取评论失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚';
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!comment.trim()) {
      setMessage({ type: 'error', text: '评论不能为空' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/comments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment: comment.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: '评论已成功提交！' });
        setComment('');
        // 刷新评论列表
        await fetchComments();
        // 清除成功消息
        setTimeout(() => {
          setMessage(null);
        }, 3000);
      } else {
        setMessage({ type: 'error', text: data.error || '提交失败，请重试' });
      }
    } catch (error) {
      console.error('提交评论失败:', error);
      setMessage({ type: 'error', text: '网络错误，请稍后重试' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Comment Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            发表评论
          </h1>
          
          {message && (
            <div
              className={`mb-4 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                评论内容
              </label>
              <input
                type="text"
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="写一条评论..."
                required
                disabled={isSubmitting}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-teal-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              {isSubmitting ? '提交中...' : '提交'}
            </button>
          </form>
        </div>

        {/* Comments List */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            所有评论 ({comments.length})
          </h2>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">加载中...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">还没有评论，成为第一个评论者吧！</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <p className="text-gray-800 mb-2">{item.comment}</p>
                  <p className="text-sm text-gray-500">
                    {formatDate(item.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

