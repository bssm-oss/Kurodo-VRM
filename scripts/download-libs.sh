#!/bin/bash
# 사이드패널에서 사용하는 외부 라이브러리를 로컬에 다운로드합니다.
# Chrome Extension MV3는 외부 CDN 스크립트 로드를 허용하지 않으므로 로컬 번들이 필요합니다.

set -e

DEST="sidepanel/lib"
THREE_VERSION="0.163.0"
THREE_VRM_VERSION="2.1.3"
THREE_VRM_ANIM_VERSION="2.1.3"
BASE="https://cdn.jsdelivr.net/npm"

mkdir -p "$DEST/addons/loaders" "$DEST/addons/utils"

echo "Downloading three.module.js..."
curl -sL "$BASE/three@$THREE_VERSION/build/three.module.js" -o "$DEST/three.module.js"

echo "Downloading GLTFLoader.js..."
curl -sL "$BASE/three@$THREE_VERSION/examples/jsm/loaders/GLTFLoader.js" -o "$DEST/addons/loaders/GLTFLoader.js"

echo "Downloading BufferGeometryUtils.js..."
curl -sL "$BASE/three@$THREE_VERSION/examples/jsm/utils/BufferGeometryUtils.js" -o "$DEST/addons/utils/BufferGeometryUtils.js"

echo "Downloading three-vrm.module.js..."
curl -sL "$BASE/@pixiv/three-vrm@$THREE_VRM_VERSION/lib/three-vrm.module.js" -o "$DEST/three-vrm.module.js"

echo "Downloading three-vrm-animation.module.js..."
curl -sL "$BASE/@pixiv/three-vrm-animation@$THREE_VRM_ANIM_VERSION/lib/three-vrm-animation.module.js" -o "$DEST/three-vrm-animation.module.js"

echo "Done."
