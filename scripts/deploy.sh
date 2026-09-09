#!/usr/bin/env bash
#
# 在服务器上更新并重新部署 SUNRISE 专业诊断前台。
#
# 用法（在服务器的仓库目录内执行，例如 /www/wwwroot/sunrise-diagnoisi）：
#   bash scripts/deploy.sh              # 部署 origin/main
#   bash scripts/deploy.sh <分支或标签>  # 部署指定分支 / 标签 / 提交
#   DEPLOY_REF=v1.2.0 bash scripts/deploy.sh
#
# 说明：
# - 脚本会用 `git reset --hard` 丢弃服务器上对「已跟踪文件」的本地改动，
#   服务器只作部署目标、不在上面改代码。
# - 根目录 `.env`（被 .gitignore 忽略，用于保存 VITE_BASE_PATH 等部署配置）
#   不会被 reset 清除。
# - 容器只监听 127.0.0.1:8090，对外域名与 HTTPS 由宝塔 / 宿主机 Nginx 处理。

set -euo pipefail

REF="${1:-${DEPLOY_REF:-main}}"
CONTAINER="sunrise-diagnosis-web"

# 切到仓库根目录（本脚本位于 <repo>/scripts/deploy.sh）
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "==> 仓库目录：$(pwd)"

# 1. 拉取最新代码
git fetch --prune origin
# 短分支名（如 main）补成 origin/<name>；标签 / 完整提交号原样使用
if git rev-parse --verify --quiet "origin/${REF}" >/dev/null; then
  TARGET="origin/${REF}"
else
  TARGET="${REF}"
fi
echo "==> 目标版本：${TARGET}"
git reset --hard "${TARGET}"
git --no-pager log -1 --format='==> 当前提交：%h %s (%ci)'

# 2. 重新构建并启动容器
docker compose up -d --build --remove-orphans

# 3. 清理悬空镜像，避免旧构建层占满磁盘
docker image prune -f >/dev/null || true

# 4. 等待 Docker 健康检查通过
echo "==> 等待容器就绪..."
for i in $(seq 1 20); do
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "${CONTAINER}" 2>/dev/null || echo missing)"
  if [ "${status}" = "healthy" ]; then
    echo "==> 健康检查通过"
    break
  fi
  if [ "${status}" = "none" ]; then
    echo "==> 容器已启动（未配置健康检查）"
    break
  fi
  if [ "${i}" -eq 20 ]; then
    echo "!! 健康检查未通过（状态：${status}），最近日志：" >&2
    docker compose logs --tail=50 web >&2
    exit 1
  fi
  sleep 3
done

# 5. 输出最终状态
docker compose ps
