import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { db } from '~/server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: '未授权' });
  }

  if (req.method === 'GET') {
    try {
      const mails = await db.mail.findMany({
        where: { userId: session.user.id },
        orderBy: { date: 'desc' },
      });

      const today = new Date();
      const validMails = mails.filter(mail => {
        // 永久邮件始终保留
        if (mail.isPermanent) return true;
        // 检查是否过期
        if (mail.expiresAt && new Date(mail.expiresAt).getTime() <= today.getTime()) {
          return false;
        }
        return true;
      });

      console.log('[mails] 查询成功:', {
        userId: session.user.id,
        total: mails.length,
        valid: validMails.length,
      });

      return res.status(200).json({ mails: validMails });
    } catch (error: any) {
      console.error('[mails] 查询失败:', error);
      return res.status(500).json({ error: '服务器错误' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { mailId, isRead, markAll } = req.body || {};

      if (markAll) {
        await db.mail.updateMany({
          where: { userId: session.user.id, isRead: false },
          data: { isRead: true },
        });
        return res.status(200).json({ success: true });
      }

      await db.mail.update({
        where: { id: mailId },
        data: { isRead },
      });

      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('[mails] 更新失败:', error);
      return res.status(500).json({ error: '服务器错误' });
    }
  }

  return res.status(405).json({ error: '方法不允许' });
}


