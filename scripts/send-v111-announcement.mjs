import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TITLE = "Echo 回心 V1.1.1 更新公告";
const SENDER = "Echo 团队";

function formatYmd(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const CONTENT = `亲爱的旅人：

Echo 现在支持一键安装桌面 App 了。

安装体积极小（不到 1 MB），本质上只是一个指向 Echo 的快捷方式——不会占用额外存储，也不会在后台运行。

安装后，Echo 会以独立窗口打开，没有地址栏、没有标签页干扰，打开即专注。

当然，Echo 本身就是 Web App，不安装也能正常使用，安装只是让你多一条更快进入专注的路径。

Echo 团队
敬上`;

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true },
  });

  const date = formatYmd();

  const ACTION_URL = "/profile?install=1";
  const ACTION_LABEL = "安装桌面 App";

  const operations = users.map((user) =>
    prisma.mail.upsert({
      where: { id: `announcement_v111_${user.id}` },
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
        id: `announcement_v111_${user.id}`,
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
    `[send-v111-announcement] 已写入 ${result.length} 封站内信，标题：${TITLE}`
  );
}

export { main };

main()
  .catch((error) => {
    console.error("[send-v111-announcement] 发送失败:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
