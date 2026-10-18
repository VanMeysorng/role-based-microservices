#!/usr/bin/env bash
# =====================================================================
# Project 2 - EC2 setup script
# Usage (run from inside the cloned repo on each EC2):
#   EC2 #1 :  bash setup.sh 1 "<MONGO_ATLAS_URI>"     -> gateway + register + login
#   EC2 #2 :  bash setup.sh 2 "<MONGO_ATLAS_URI>"     -> admin-service
#   EC2 #3 :  bash setup.sh 3 "<MONGO_ATLAS_URI>"     -> user-service
# The Mongo URI must include the DB name, e.g.
#   mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/university_user_management
# =====================================================================
set -e

ROLE="$1"
MONGO_URI="$2"
JWT_SECRET="${JWT_SECRET:-super_secret_university_jwt_key_2026}"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ ! "$ROLE" =~ ^[123]$ || -z "$MONGO_URI" ]]; then
  echo "Usage: bash setup.sh <1|2|3> \"<MONGO_ATLAS_URI>\""
  exit 1
fi

echo "=== [1/5] Update & upgrade Ubuntu ==="
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

echo "=== [2/5] Git check ==="
if command -v git >/dev/null 2>&1; then
  echo "Git already installed: $(git --version)"
else
  sudo apt-get install -y git && git --version
fi

echo "=== [3/5] Node.js 22 + npm ==="
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node -v && npm -v
command -v pm2 >/dev/null 2>&1 || sudo npm install -g pm2

write_env () {   # $1 = service dir, $2 = port, $3 = extra lines
  printf "PORT=%s\nMONGO_URI=%s\n%b" "$2" "$MONGO_URI" "$3" > "$REPO_DIR/$1/.env"
}

start_service () {  # $1 = service dir, $2 = pm2 name
  echo "--- npm install in $1"
  (cd "$REPO_DIR/$1" && npm install --omit=dev)
  pm2 delete "$2" >/dev/null 2>&1 || true
  (cd "$REPO_DIR/$1" && pm2 start server.js --name "$2")
}

echo "=== [4/5] Configure & start services for EC2 #$ROLE ==="
case "$ROLE" in
  1)
    write_env register-service 5001 ""
    write_env login-service   5002 "JWT_SECRET=$JWT_SECRET\n"
    printf "PORT=5000\nJWT_SECRET=%s\n" "$JWT_SECRET" > "$REPO_DIR/api-gateway/.env"
    if grep -q "REPLACE_WITH_EC2" "$REPO_DIR/api-gateway/server.js"; then
      echo "WARNING: api-gateway/server.js still has REPLACE_WITH_EC2_x_PUBLIC_IP."
      echo "         Put the EC2 #2 / #3 public IPs in it, push to GitHub, then git pull here."
    fi
    start_service register-service register-service
    start_service login-service    login-service
    start_service api-gateway      api-gateway
    ;;
  2)
    write_env admin-service 5003 ""
    start_service admin-service admin-service
    ;;
  3)
    write_env user-service 5004 ""
    start_service user-service user-service
    ;;
esac

echo "=== [5/5] Status ==="
pm2 save >/dev/null
pm2 list
PUBLIC_IP=$(curl -s --max-time 3 https://checkip.amazonaws.com || echo "<public-ip>")
echo "Done. Test in browser: http://$PUBLIC_IP:$( [[ $ROLE == 1 ]] && echo 5000 || ([[ $ROLE == 2 ]] && echo 5003 || echo 5004) )/"
echo "Logs: pm2 logs    Restart after git pull: pm2 restart all"
