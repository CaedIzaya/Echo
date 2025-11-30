import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./[...nextauth]";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "方法不允许" });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "未登录" });
  }

  // 清除所有可能的 session cookie（包括生产环境的 __Secure- 前缀）
  const isProduction = process.env.NODE_ENV === 'production';
  const cookiesToClear = [
    'next-auth.session-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax',
    'next-auth.csrf-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax',
  ];
  
  // 如果是生产环境，也清除带 __Secure- 前缀的 Cookie
  if (isProduction) {
    cookiesToClear.push(
      '__Secure-next-auth.session-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax; Secure',
      '__Secure-next-auth.csrf-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax; Secure'
    );
  }
  
  res.setHeader('Set-Cookie', cookiesToClear);

  res.status(200).json({ message: "退出登录成功" });
}