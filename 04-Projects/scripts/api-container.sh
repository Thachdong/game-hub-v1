#!/usr/bin/env bash
# Run the Game Hub API as a standalone Docker container, sourced fresh from
# the develop-api branch — regardless of which branch (develop-webapps,
# feature/webapps/*, ...) is currently checked out in your working tree.
#
# How it works: the API's source only exists on the develop-api branch, so
# this script keeps a separate git worktree checked out to that branch
# (outside the main working tree, so it never collides with whatever branch
# you have open) and runs `docker compose` from inside it. Run this from any
# branch, any directory.
#
# Usage:
#   04-Projects/scripts/api-container.sh <command> [args...]
#
# Commands:
#   sync          Fetch/update the develop-api worktree without starting anything
#   build         Sync, then build the API image
#   up            Sync, build if needed, and start api + postgres + pgadmin (detached)
#   dev           Same as up, but hot-reloads on source changes (bind-mounted)
#   down          Stop and remove the containers
#   restart       Restart just the api container
#   logs          Tail api container logs
#   migrate       Run pending TypeORM migrations inside the api container
#   shell         Open a shell inside the running api container
#   ps            Show container status
#   rm-worktree   Remove the develop-api worktree entirely
#
# Env overrides:
#   API_BRANCH    Branch to build the API from (default: develop-api)
#   WORKTREE_DIR  Where to check it out (default: sibling dir of the repo)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
REPO_NAME="$(basename "$REPO_ROOT")"

API_BRANCH="${API_BRANCH:-develop-api}"
WORKTREE_DIR="${WORKTREE_DIR:-$(cd "$REPO_ROOT/.." && pwd)/.${REPO_NAME}-worktrees/api}"
API_SUBDIR="04-Projects/api"

log() { printf '\033[1;34m[api-container]\033[0m %s\n' "$*" >&2; }
die() { printf '\033[1;31m[api-container]\033[0m %s\n' "$*" >&2; exit 1; }

# Sets API_DIR: if $API_BRANCH is already checked out in the main repo, use it
# directly (a worktree would collide — git refuses to check out the same
# branch twice, and it'd be a redundant copy anyway). Otherwise use the
# develop-api worktree.
resolve_api_dir() {
  local current_branch
  current_branch="$(git -C "$REPO_ROOT" branch --show-current)"

  if [ "$current_branch" = "$API_BRANCH" ]; then
    API_DIR="$REPO_ROOT/$API_SUBDIR"
  else
    API_DIR="$WORKTREE_DIR/$API_SUBDIR"
  fi
}

sync_worktree() {
  resolve_api_dir

  if [ "$API_DIR" = "$REPO_ROOT/$API_SUBDIR" ]; then
    log "already on '$API_BRANCH' — using $API_DIR directly (no worktree)"
    [ -d "$API_DIR" ] || die "$API_SUBDIR not found on branch '$API_BRANCH'"
    bootstrap_env
    return 0
  fi

  mkdir -p "$(dirname "$WORKTREE_DIR")"

  git -C "$REPO_ROOT" fetch origin "$API_BRANCH" 2>/dev/null \
    || log "could not fetch origin/$API_BRANCH (offline? using local ref)"

  if [ ! -e "$WORKTREE_DIR/.git" ]; then
    log "creating worktree for '$API_BRANCH' at $WORKTREE_DIR"
    git -C "$REPO_ROOT" worktree add "$WORKTREE_DIR" "$API_BRANCH"
  else
    log "updating worktree ('$API_BRANCH')"
    git -C "$WORKTREE_DIR" checkout "$API_BRANCH"
    git -C "$WORKTREE_DIR" pull --ff-only origin "$API_BRANCH" \
      || log "pull failed/skipped, using worktree as-is"
  fi

  [ -d "$API_DIR" ] || die "$API_SUBDIR not found on branch '$API_BRANCH' — wrong branch name?"

  bootstrap_env
}

bootstrap_env() {
  [ -f "$API_DIR/.env" ] && return 0

  if [ -f "$REPO_ROOT/$API_SUBDIR/.env" ]; then
    log "copying .env from your current checkout (${REPO_ROOT#$(dirname "$REPO_ROOT")/})"
    cp "$REPO_ROOT/$API_SUBDIR/.env" "$API_DIR/.env"
  elif [ -f "$API_DIR/.env.example" ]; then
    log "no .env found anywhere — seeding $API_SUBDIR/.env from .env.example"
    log "fill in JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, GOOGLE_CLIENT_SECRET before starting"
    cp "$API_DIR/.env.example" "$API_DIR/.env"
  else
    die "no .env or .env.example available to bootstrap $API_SUBDIR/.env"
  fi
}

compose() {
  (cd "$API_DIR" && docker compose "$@")
}

compose_dev() {
  (cd "$API_DIR" && docker compose -f docker-compose.yml -f docker-compose.dev.yml "$@")
}

cmd="${1:-}"
[ $# -gt 0 ] && shift || true

# Commands that don't sync still need to know where the compose project is.
case "$cmd" in
  sync|build|up|dev|rm-worktree|""|help|-h|--help) ;;
  *) resolve_api_dir ;;
esac

case "$cmd" in
  sync)        sync_worktree ;;
  build)       sync_worktree; compose build "$@" ;;
  up)          sync_worktree; compose up -d --build "$@" ;;
  dev)         sync_worktree; compose_dev up -d --build "$@" ;;
  down)        compose down "$@" ;;
  restart)     compose restart api ;;
  logs)        compose logs -f api "$@" ;;
  migrate)     compose exec api npm run migration:run ;;
  shell)       compose exec api sh ;;
  ps|status)   compose ps ;;
  rm-worktree)
    git -C "$REPO_ROOT" worktree remove "$WORKTREE_DIR" --force
    ;;
  ""|help|-h|--help)
    sed -n '2,26p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
    ;;
  *)
    die "unknown command '$cmd' — run '$0 help'"
    ;;
esac
