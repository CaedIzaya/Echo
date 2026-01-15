# ECS 重新构建步骤（清理缓存）

## 问题
`npm run build` 报错提示 `finalGoalContent` 不存在，但代码中已经移除。这是 Prisma Client 缓存问题。

## 解决步骤

```bash
cd /www/wwwroot/echoo.xin

# 1. 删除旧的 Prisma Client 缓存
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client

# 2. 删除 Next.js 构建缓存
rm -rf .next

# 3. 重新生成 Prisma Client（基于新 schema）
npx prisma generate

# 4. 重新构建
npm run build

# 5. 重启应用
pm2 restart echo-focus
```

## 预期结果
- Prisma Client 会基于新的 schema（没有 finalGoal* 字段）重新生成
- TypeScript 类型检查通过
- 构建成功

## 如果还失败
检查是否还有其他文件引用了旧字段：
```bash
grep -r "finalGoalContent\|finalGoalIsCompleted" src/
```

如果找到，请手动删除这些引用。

