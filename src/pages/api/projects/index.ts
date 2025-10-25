import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 📥 /api/projects 请求`);
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ error: '未授权' });
    }

    // 这里从数据库获取用户项目
    // 暂时返回示例数据
    const projects = [
      {
        id: '1',
        name: '示例项目',
        icon: '📚',
        dailyGoalMinutes: 30,
        milestones: [
          { id: '1', title: '完成第一章阅读', isCompleted: false, order: 0 },
          { id: '2', title: '练习30分钟', isCompleted: false, order: 1 },
        ],
        isActive: true,
        isPrimary: true,
      }
    ];

    return res.status(200).json({ projects });
  } catch (error) {
    console.error('获取项目失败:', error);
    return res.status(500).json({ error: '服务器错误' });
  }
}