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
API_CONTAINER="sunrise-takken-api"

# 切到仓库根目录（本脚本位于 <repo>/scripts/deploy.sh）
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "==> 仓库目录：$(pwd)"

# 1. 拉取最新代码
# 服务器上被 git 跟踪的文件（含 .env.example、docker-compose.yml）会被下面的 reset --hard 还原。
# 如果发现有人在服务器上改过它们，先把改动存成补丁再继续，并明确提示，避免"填好的配置部署一次就变空"。
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  mkdir -p .deploy-backups
  PATCH=".deploy-backups/local-changes-$(date +%Y%m%d-%H%M%S).patch"
  git diff HEAD > "${PATCH}"
  echo "!! 检测到服务器上有未提交的改动，本次部署会把它们还原（已备份为 ${PATCH}）：" >&2
  git status --short --untracked-files=no >&2
  echo "   配置请写在项目根目录的 .env（被 git 忽略，部署不会动它），不要改 .env.example 等被跟踪的文件。" >&2
fi

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

# 2. 部署前检查：题库 API 需要 .env 里的数据库配置，以及宿主机上的 MySQL socket
if [ ! -f .env ]; then
  echo "!! 找不到项目根目录的 .env。.env.example 只是模板，请新建 .env 并写入 TAKKEN_DB_NAME / TAKKEN_DB_USER / TAKKEN_DB_PASSWORD / TAKKEN_ADMIN_TOKEN（不要直接改 .env.example，部署会把它还原）。" >&2
  exit 1
fi
env_value() { grep -E "^$1=" .env 2>/dev/null | tail -n1 | cut -d= -f2- || true; }
for key in TAKKEN_DB_NAME TAKKEN_DB_USER TAKKEN_DB_PASSWORD; do
  if [ -z "$(env_value "${key}")" ]; then
    echo "!! 项目根目录 .env 缺少 ${key}（见 README「题库 API 与数据库」）" >&2
    exit 1
  fi
done
DB_SOCKET_PATH="$(env_value TAKKEN_DB_SOCKET)"
DB_SOCKET_PATH="${DB_SOCKET_PATH:-/tmp/mysql.sock}"
if [ ! -S "${DB_SOCKET_PATH}" ]; then
  echo "!! 找不到 MySQL socket：${DB_SOCKET_PATH}" >&2
  echo "   在服务器上用 \`mysqladmin variables | grep socket\` 或宝塔「数据库 → 设置」查实际路径，" >&2
  echo "   然后在 .env 里写 TAKKEN_DB_SOCKET=<路径>。" >&2
  exit 1
fi

# 3. 重新构建并启动容器
docker compose up -d --build --remove-orphans

# 4. 清理悬空镜像，避免旧构建层占满磁盘
docker image prune -f >/dev/null || true

# 5. 等待 Docker 健康检查通过
echo "==> 等待容器就绪..."
wait_healthy() {
  local container="$1" service="$2" status
  for i in $(seq 1 20); do
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "${container}" 2>/dev/null || echo missing)"
    if [ "${status}" = "healthy" ]; then
      echo "==> ${container} 健康检查通过"
      return 0
    fi
    if [ "${status}" = "none" ]; then
      echo "==> ${container} 已启动（未配置健康检查）"
      return 0
    fi
    sleep 3
  done
  echo "!! ${container} 健康检查未通过（状态：${status}），最近日志：" >&2
  docker compose logs --tail=50 "${service}" >&2
  return 1
}
wait_healthy "${API_CONTAINER}" takken-api
wait_healthy "${CONTAINER}" web

# 6. 输出最终状态
docker compose ps
