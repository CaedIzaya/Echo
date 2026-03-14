import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TITLE = "Echo 回心 v1.1.0更新公告";
const SENDER = "Echo 团队";
const ACTION_URL = "/lumi";
const ACTION_LABEL = "去和 Lumi 聊聊";

function formatYmd(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const CONTENT = `旅人们：

想和你们分享一个关于 Echo 的新进展。
Echo 回心 v1.1.0 已经到来。这一次，我们把更多温柔的陪伴，放进了 Echo 里。

本次重点更新：Lumi 聊天室（AI Lumi）
1. 想放松一下、随便聊聊天时，Lumi 会像一只轻松可爱的小精灵一样陪在你身边。
2. 当你一时不知道该怎么安排计划、思绪有些乱的时候，Lumi 会陪你一起整理想法，并帮你生成计划或一个个更容易开始的小目标。
3. 如果你对 Echo 的功能、用法还有不清楚的地方，也可以直接问 Lumi。

除此之外，这次我们也做了几项体验更新：
1. 创建计划流程进一步优化，步骤更少，开始更快。
2. 新增新手指引功能，帮助新旅人更轻松地熟悉 Echo。
3. 欢迎页 UI 升级，整体变得更灵动，也更简约了。

感谢每一位旅人的到来、停留与陪伴。
Echo 会继续努力，带来更好的专注体验，也希望在你需要的时候，给你一份轻轻的陪伴。

Echo 团队
敬上`;

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true },
  });

  const date = formatYmd();

  const operations = users.map((user) =>
    prisma.mail.upsert({
      where: { id: `announcement_v110_${user.id}` },
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
        id: `announcement_v110_${user.id}`,
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
    `[send-v110-announcement] 已写入 ${result.length} 封站内信，标题：${TITLE}`
  );
}

main()
  .catch((error) => {
    console.error("[send-v110-announcement] 发送失败:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
