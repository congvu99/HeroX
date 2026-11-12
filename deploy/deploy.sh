#!/usr/bin/env bash
# git pull → build image (tag = commit) → backup DB LingoBrain (chứa schema herox) → thay container
# → đợi /herox/api/ready 200 và trang /herox/ 200 → lỗi thì quay về bản cũ.
# Chạy trên VPS bằng user deploy: bash deploy/deploy.sh  (FORCE=1 để build lại cùng commit)
set -euo pipefail
cd "$(dirname "$0")/.."
exec 9>/tmp/herox-deploy.lock
flock -n 9 || { echo "deploy khác đang chạy"; exit 1; }

# Dữ liệu HeroX nằm trong DB của LingoBrain: backup bằng script của LingoBrain.
LINGOBRAIN_BACKUP=${LINGOBRAIN_BACKUP:-/srv/apps/lingobrain/deploy/backup.sh}
READY_ATTEMPTS=45
READY_INTERVAL_SECONDS=2

git pull --ff-only
TAG=$(git rev-parse --short HEAD)
PREV=$(cat .deployed-tag 2>/dev/null || true)
if [ "$TAG" = "$PREV" ] && [ -z "${FORCE:-}" ]; then echo "already at $TAG, nothing to deploy"; exit 0; fi

IMAGE_TAG=$TAG docker compose build herox herox-web
if [ -n "$PREV" ]; then bash "$LINGOBRAIN_BACKUP"; fi
IMAGE_TAG=$TAG docker compose up -d --no-build

is_ready() {
  # /ready chỉ 200 khi kết nối DB được và migration xong; /health thì 200 cả khi DB sập nên không dùng.
  docker compose exec -T herox wget -q -O /dev/null http://127.0.0.1:3180/herox/api/ready 2>/dev/null \
    && docker compose exec -T herox-web wget -q -O /dev/null http://127.0.0.1/herox/ 2>/dev/null
}

for _ in $(seq 1 "$READY_ATTEMPTS"); do
  if is_ready; then
    echo "$TAG" > .deployed-tag
    for image in herox herox-web; do
      docker tag "$image:$TAG" "$image:latest"
      docker images "$image" --format '{{.Tag}}' | grep -vxE "latest|$TAG|${PREV:-none}" \
        | xargs -r -I{} docker rmi "$image:{}" >/dev/null 2>&1 || true
    done
    echo "deploy ok: $TAG"; exit 0
  fi
  sleep "$READY_INTERVAL_SECONDS"
done

docker compose logs --tail 60 herox herox-web
if [ -n "$PREV" ]; then
  IMAGE_TAG=$PREV docker compose up -d --no-build
  echo "deploy FAILED ($TAG), rolled back to $PREV"
else
  echo "deploy FAILED ($TAG), chưa có bản cũ để quay về"
fi
exit 1
