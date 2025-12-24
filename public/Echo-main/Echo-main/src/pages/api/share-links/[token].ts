import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ message: 'Invalid token' });
  }

  try {
    const shareLink = await db.shareLink.findUnique({
      where: { token },
      include: {
        summary: true,
        user: {
          select: { name: true, image: true }
        }
      }
    });

    if (!shareLink) {
      return res.status(404).json({ message: 'Share link not found' });
    }

    return res.status(200).json(shareLink);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}









