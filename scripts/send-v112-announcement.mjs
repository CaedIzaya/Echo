import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TITLE = "Echo 回心 V1.1.2 更新公告";
const SENDER = "Echo 团队";

function formatYmd(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const CONTENT = `亲爱的旅人：

这次更新不大，但都是和"专注体验"直接相关的小改进。

一、手机端 Lumi 聊天室 UI 更新
我们为手机端的 Lumi 聊天室重新设计了布局——更干净、更简约，打开就能直接聊，不再有多余的视觉干扰。
电脑端保持不变，手机端会自动切换为新界面。

二、专注期间的温柔提醒
现在，Echo 会在两个时刻轻轻提醒你：
· 当你完成今日目标时——告诉你"够了，今天的你已经很棒了"。
· 当你暂时离开 App 时——温柔地把你拉回来。

提醒不是催促，只是一个轻轻的信号。
如果你不需要，可以随时在「个人中心」里关闭。

小提示：iPhone / iPad 用户需要先把 Echo 添加到主屏幕（Safari → 分享 → 添加到主屏幕），以桌面 App 的方式打开才能收到提醒。这是 iOS 系统的限制，普通浏览器里暂时收不到，不是 Echo 的锅。

感谢每一位旅人的耐心与陪伴。
我们继续一步一步，把 Echo 做得更好。

Echo 团队
敬上`;

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true },
  });

  const date = formatYmd();

  const ACTION_URL = "/lumi";
  const ACTION_LABEL = "去和 Lumi 聊聊";

  const operations = users.map((user) =>
    prisma.mail.upsert({
      where: { id: `announcement_v112_${user.id}` },
      update: {
        title: TITLE,
        content: CONTENT,
        date,
        sender: SENDER,
        type: "system",
        isRead: false,
        isPermanent: true,
        actionUrl: ACTION_URL,
        actionLabel: ACTION_LABEL,
      },
      create: {
        id: `announcement_v112_${user.id}`,
        userId: user.id,
        title: TITLE,
        content: CONTENT,
        date,
        sender: SENDER,
        type: "system",
        isRead: false,
        isPermanent: true,
        actionUrl: ACTION_URL,
        actionLabel: ACTION_LABEL,
      },
    })
  );

  const result = await prisma.$transaction(operations);
  console.log(
    `[send-v112-announcement] 已写入 ${result.length} 封站内信，标题：${TITLE}`
  );
}

export { main };

main()
  .catch((error) => {
    console.error("[send-v112-announcement] 发送失败:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
