/**
 * Vercel 配置检查脚本
 * 检查 Vercel 环境变量和部署配置
 * 
 * 使用方法:
 * 1. 安装 Vercel CLI: npm i -g vercel
 * 2. 登录: vercel login
 * 3. 运行: npx tsx scripts/check-vercel-config.ts
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

interface CheckResult {
  name: string;
  status: "✅ 通过" | "⚠️  警告" | "❌ 失败";
  message: string;
  suggestion?: string;
}

const results: CheckResult[] = [];

function check(
  name: string,
  status: "✅ 通过" | "⚠️  警告" | "❌ 失败",
  message: string,
  suggestion?: string
) {
  results.push({ name, status, message, suggestion });
}

function runCommand(command: string): string | null {
  try {
    return execSync(command, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch (error) {
    return null;
  }
}

async function main() {
  console.log("🔍 检查 Vercel 配置...\n");
  console.log("=".repeat(60) + "\n");

  // 检查 1: Vercel CLI 是否安装
  const vercelVersion = runCommand("vercel --version");
  if (vercelVersion) {
    check("Vercel CLI", "✅ 通过", `已安装版本: ${vercelVersion}`);
  } else {
    check(
      "Vercel CLI",
      "❌ 失败",
      "Vercel CLI 未安装",
      "运行: npm i -g vercel"
    );
    printResults();
    return;
  }

  // 检查 2: 是否已登录
  const whoami = runCommand("vercel whoami");
  if (whoami) {
    check("Vercel 登录状态", "✅ 通过", `已登录用户: ${whoami}`);
  } else {
    check(
      "Vercel 登录状态",
      "❌ 失败",
      "未登录 Vercel",
      "运行: vercel login"
    );
    printResults();
    return;
  }

  // 检查 3: .vercel 目录是否存在
  const vercelDir = path.join(process.cwd(), ".vercel");
  if (fs.existsSync(vercelDir)) {
    check("项目链接", "✅ 通过", "项目已链接到 Vercel");
  } else {
    check(
      "项目链接",
      "⚠️  警告",
      "项目未链接到 Vercel",
      "运行: vercel link"
    );
  }

  // 检查 4: 获取 Vercel 环境变量
  console.log("\n📋 获取 Vercel 环境变量...\n");
  
  const envProduction = runCommand("vercel env ls production");
  const envPreview = runCommand("vercel env ls preview");
  const envDevelopment = runCommand("vercel env ls development");

  if (envProduction) {
    console.log("生产环境变量:");
    console.log(envProduction);
    
    // 检查关键环境变量
    const hasDatabase = envProduction.includes("DATABASE_URL");
    const hasNextAuth = envProduction.includes("NEXTAUTH_SECRET");
    const hasNextAuthUrl = envProduction.includes("NEXTAUTH_URL");

    if (hasDatabase) {
      check("DATABASE_URL (生产)", "✅ 通过", "已设置");
    } else {
      check(
        "DATABASE_URL (生产)",
        "❌ 失败",
        "未设置",
        "在 Vercel 仪表板设置环境变量"
      );
    }

    if (hasNextAuth) {
      check("NEXTAUTH_SECRET (生产)", "✅ 通过", "已设置");
    } else {
      check(
        "NEXTAUTH_SECRET (生产)",
        "❌ 失败",
        "未设置",
        "在 Vercel 仪表板设置环境变量"
      );
    }

    if (hasNextAuthUrl) {
      check("NEXTAUTH_URL (生产)", "✅ 通过", "已设置");
    } else {
      check(
        "NEXTAUTH_URL (生产)",
        "⚠️  警告",
        "未设置",
        "可能自动检测，但建议明确设置"
      );
    }
  } else {
    check(
      "环境变量检查",
      "❌ 失败",
      "无法获取 Vercel 环境变量",
      "确保已链接项目并有访问权限"
    );
  }

  // 检查 5: 本地 .env 文件
  console.log("\n📋 检查本地环境变量...\n");
  
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    
    const hasDatabaseUrl = envContent.includes("DATABASE_URL=") && 
                          !envContent.match(/^\s*#\s*DATABASE_URL=/m);
    const hasNextAuthSecret = envContent.includes("NEXTAUTH_SECRET=") && 
                             !envContent.match(/^\s*#\s*NEXTAUTH_SECRET=/m);
    const hasNextAuthUrl = envContent.includes("NEXTAUTH_URL=") && 
                          !envContent.match(/^\s*#\s*NEXTAUTH_URL=/m);

    if (hasDatabaseUrl) {
      const urlMatch = envContent.match(/DATABASE_URL=(.+)/);
      const url = urlMatch ? urlMatch[1] : "";
      const isNeon = url.includes("neon.tech");
      const isPooler = url.includes("pooler");
      
      check("DATABASE_URL (本地)", "✅ 通过", 
        `已设置${isNeon ? " (Neon)" : ""}${isPooler ? " (使用连接池)" : ""}`);
      
      if (!isPooler && isNeon) {
        check(
          "连接池配置",
          "⚠️  警告",
          "建议使用 Neon 的 pooler 端点",
          "在连接字符串中使用 -pooler 端点"
        );
      }
    } else {
      check("DATABASE_URL (本地)", "❌ 失败", "未设置或被注释");
    }

    if (hasNextAuthSecret) {
      check("NEXTAUTH_SECRET (本地)", "✅ 通过", "已设置");
    } else {
      check("NEXTAUTH_SECRET (本地)", "❌ 失败", "未设置");
    }

    if (hasNextAuthUrl) {
      check("NEXTAUTH_URL (本地)", "✅ 通过", "已设置");
    } else {
      check("NEXTAUTH_URL (本地)", "⚠️  警告", "未设置");
    }
  } else {
    check(".env 文件", "❌ 失败", ".env 文件不存在");
  }

  // 检查 6: vercel.json 配置
  const vercelJsonPath = path.join(process.cwd(), "vercel.json");
  if (fs.existsSync(vercelJsonPath)) {
    try {
      const vercelJson = JSON.parse(fs.readFileSync(vercelJsonPath, "utf-8"));
      check("vercel.json", "✅ 通过", "配置文件存在");
      
      if (vercelJson.env) {
        console.log("\nvercel.json 环境变量:");
        console.log(JSON.stringify(vercelJson.env, null, 2));
      }
    } catch (error) {
      check("vercel.json", "❌ 失败", "配置文件格式错误");
    }
  } else {
    check("vercel.json", "⚠️  警告", "配置文件不存在（可选）");
  }

  // 检查 7: Prisma 生成状态
  const prismaClientPath = path.join(process.cwd(), "node_modules", ".prisma", "client");
  if (fs.existsSync(prismaClientPath)) {
    check("Prisma Client", "✅ 通过", "已生成");
  } else {
    check(
      "Prisma Client",
      "❌ 失败",
      "未生成",
      "运行: npx prisma generate"
    );
  }

  printResults();
  
  // 提供下一步建议
  console.log("\n" + "=".repeat(60));
  console.log("\n💡 下一步操作:\n");
  
  const failedChecks = results.filter(r => r.status === "❌ 失败");
  const warningChecks = results.filter(r => r.status === "⚠️  警告");
  
  if (failedChecks.length > 0) {
    console.log("⚠️  需要修复以下问题:\n");
    failedChecks.forEach((result, i) => {
      console.log(`${i + 1}. ${result.name}`);
      console.log(`   问题: ${result.message}`);
      if (result.suggestion) {
        console.log(`   建议: ${result.suggestion}`);
      }
      console.log();
    });
  }
  
  if (warningChecks.length > 0) {
    console.log("📌 建议优化:\n");
    warningChecks.forEach((result, i) => {
      console.log(`${i + 1}. ${result.name}`);
      console.log(`   ${result.message}`);
      if (result.suggestion) {
        console.log(`   建议: ${result.suggestion}`);
      }
      console.log();
    });
  }
  
  if (failedChecks.length === 0) {
    console.log("✅ 所有关键配置正常！\n");
    console.log("如果 Vercel 上仍然出现数据不保存的问题，请检查:");
    console.log("1. 运行测试脚本: npx tsx scripts/test-db-connection.ts");
    console.log("2. 检查 Vercel 部署日志是否有错误");
    console.log("3. 确认 Vercel 上的 DATABASE_URL 与本地一致");
    console.log("4. 检查应用代码中的数据保存逻辑");
    console.log("\n查看详细诊断: 阅读 VERCEL_DATA_PERSISTENCE_GUIDE.md");
  }
}

function printResults() {
  console.log("\n" + "=".repeat(60));
  console.log("📊 检查结果:\n");
  
  results.forEach((result) => {
    console.log(`${result.status} ${result.name}`);
    console.log(`   ${result.message}`);
    if (result.suggestion) {
      console.log(`   💡 ${result.suggestion}`);
    }
    console.log();
  });
  
  const passCount = results.filter(r => r.status === "✅ 通过").length;
  const warnCount = results.filter(r => r.status === "⚠️  警告").length;
  const failCount = results.filter(r => r.status === "❌ 失败").length;
  
  console.log("=".repeat(60));
  console.log(`\n📈 统计: ${passCount} 通过 | ${warnCount} 警告 | ${failCount} 失败\n`);
}

main().catch((error) => {
  console.error("\n❌ 检查过程中发生错误:");
  console.error(error);
  process.exit(1);
});




