#!/usr/bin/env bash
# Photos and videos for the deploy, without downloading all of them from git
# on every run.
#
# The deploy checks out the repository without its media (a blobless, sparse
# clone), so only the text files come from git. The media are kept in a cache
# folder, each file named by its git blob id:
#
#   ci-media.sh list    prints the cache key for the current set of media
#   ci-media.sh place   puts every file in the working tree, from the cache,
#                       fetching only what the cache lacks from git, in one go
set -euo pipefail

store="${MEDIA_STORE:-$HOME/site-media}"
list="${RUNNER_TEMP:-/tmp}/site-media.tsv"

# Every tracked photo, video and sound, except the notes in docs/, which the
# build never reads. Lines are "<mode> blob <id>\t<path>".
media() {
  git -c core.quotePath=false ls-tree -r HEAD \
    | grep -iE '\.(jpe?g|png|gif|webp|avif|mp4|webm|mov|mp3|m4a|wav|ogg)$' \
    | grep -v $'\tdocs/' || true
}
digest() { if command -v sha256sum > /dev/null; then sha256sum; else shasum -a 256; fi; }

case "${1:-}" in
  list)
    media > "$list"
    printf 'key=%s\n' "$(awk '{print $3}' "$list" | sort -u | digest | cut -c1-16)"
    ;;
  place)
    media > "$list"
    mkdir -p "$store"
    : > "$list.missing"
    while IFS=$'\t' read -r meta path; do
      [ -f "$store/${meta##* }" ] || printf '%s\n' "$path" >> "$list.missing"
    done < "$list"
    # Widening the sparse checkout fetches every missing file in one request.
    # It runs before anything is placed: git clears files outside its patterns
    # when the patterns change.
    if [ -s "$list.missing" ]; then
      sed 's/[][*?!#\\]/\\&/g; s|^|/|' "$list.missing" | git sparse-checkout add --stdin
    fi
    while IFS=$'\t' read -r meta path; do
      blob="$store/${meta##* }"
      if [ ! -f "$path" ]; then
        mkdir -p "$(dirname "$path")"
        ln "$blob" "$path"
      elif [ ! -f "$blob" ]; then
        ln "$path" "$blob"
      fi
    done < "$list"
    # Keep the cache to the current set, so it does not grow with each change.
    awk '{print $3}' "$list" | sort -u > "$list.keep"
    ls "$store" | sort | comm -23 - "$list.keep" | while read -r stale; do rm -f "$store/$stale"; done
    echo "$(wc -l < "$list" | tr -d ' ') photos and videos placed, $(wc -l < "$list.missing" | tr -d ' ') of them fetched from git"
    ;;
  *)
    echo "usage: $0 list|place" >&2
    exit 2
    ;;
esac
