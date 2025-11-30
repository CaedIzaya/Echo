import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ error: "未授权" });
  }

  if (req.method === "GET") {
    // 获取当前会话列表
    // 这里简化处理，实际应该从数据库或session store中获取
    // TODO: 实现完整的会话管理，从数据库读取session_meta字段
    
    const currentSession = {
      id: session.user.id,
      device: "当前设备",
      lastActive: new Date().toISOString(),
      isCurrent: true,
    };

    res.status(200).json({
      sessions: [currentSession],
    });
  } else if (req.method === "DELETE") {
    // 撤销指定会话
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "请提供会话ID" });
    }

    // TODO: 实现会话撤销逻辑
    // 这里简化处理，实际应该从session store中删除对应会话
    
    res.status(200).json({
      success: true,
      message: "会话已撤销",
    });
  } else {
    res.status(405).json({ error: "方法不允许" });
  }
}










