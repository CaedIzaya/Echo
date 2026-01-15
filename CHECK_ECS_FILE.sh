#!/bin/bash
# 在 ECS 上执行这个命令检查文件

cd /www/wwwroot/echoo.xin
grep -n "finalGoalContent" src/pages/api/projects/index.ts

# 如果有输出，说明 ECS 上的文件是旧版本
# 需要重新上传正确的文件

