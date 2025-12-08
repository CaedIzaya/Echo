import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { getServerSession } from "next-auth";
import { authOptions } from "../../../server/auth";
import { randomBytes } from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { summaryId } = req.body;

  if (!summaryId) {
    return res.status(400).json({ message: 'Missing summaryId' });
  }

  try {
    // Check ownership
    const summary = await db.dailySummary.findUnique({
      where: { id: summaryId },
    });

    if (!summary || summary.userId !== session.user.id) {
      return res.status(404).json({ message: 'Summary not found or unauthorized' });
    }

    // Generate token
    const token = randomBytes(16).toString('hex'); // 32 chars

    const shareLink = await db.shareLink.create({
      data: {
        userId: session.user.id,
        summaryId,
        token,
      },
    });

    // Construct full URL (using origin from request headers or env)
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    const shareUrl = `${protocol}://${host}/s/${token}`;

    return res.status(200).json({ shareUrl, token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

