#!/usr/bin/env bash
# Build the TINA app image (Go server + built SPA, root Dockerfile).
#
# Builds for linux/amd64 and linux/arm64 — one multi-arch image that runs on
# Windows, Linux and macOS (Intel + Apple Silicon) via Docker Desktop's
# Linux VM.
#
# Modes:
#   ./build-multiarch.sh          native arch, loaded into the local docker
#                                 image store (ready for `docker compose up`).
#   ./build-multiarch.sh --oci    both arches exported to a portable OCI
#                                 tarball (tina-app-multiarch.oci.tar) you
#                                 can copy to another machine.
#   ./build-multiarch.sh --push <ref>
#                                 both arches built and pushed as a multi-arch
#                                 manifest to registry <ref>, e.g.
#                                 myregistry.azurecr.io/tina-app:latest
#                                 (log in first: az acr login -n myregistry)
#
# The SPA's VITE_API_URL/VITE_WS_URL are baked in at build time; override for
# a non-localhost deployment:
#   ./build-multiarch.sh --push <ref> \
#       --build-arg VITE_API_URL=https://tina.example.com \
#       --build-arg VITE_WS_URL=wss://tina.example.com/ws
# Extra args after the mode are passed through to `docker buildx build`.
#
# Note: a multi-arch manifest cannot live in the plain local docker image
# store — buildx needs --push (registry) or --output type=oci (tarball) to
# materialize both arches at once. For everyday local use, the default mode
# (or `docker compose build app`) builds the correct native arch.
set -euo pipefail
cd "$(dirname "$0")"

IMAGE=tina-app:latest
PLATFORMS=linux/amd64,linux/arm64
BUILDER=tina-builder

# Ensure a buildx builder with multi-platform support exists.
if ! docker buildx inspect "$BUILDER" >/dev/null 2>&1; then
    docker buildx create --name "$BUILDER" --use >/dev/null
else
    docker buildx use "$BUILDER"
fi

mode="${1:-native}"
case "$mode" in
    native)
        echo "Building $IMAGE for the native platform and loading into docker..."
        docker buildx build --load -t "$IMAGE" "${@:2}" .
        ;;
    --oci)
        out=tina-app-multiarch.oci.tar
        echo "Building $IMAGE for $PLATFORMS -> $out ..."
        docker buildx build --platform "$PLATFORMS" -t "$IMAGE" \
            --output "type=oci,dest=$out" "${@:2}" .
        ;;
    --push)
        ref="${2:?usage: build-multiarch.sh --push <registry/image:tag>}"
        echo "Building and pushing $ref for $PLATFORMS ..."
        docker buildx build --platform "$PLATFORMS" -t "$ref" --push "${@:3}" .
        ;;
    *)
        echo "unknown mode '$mode' (expected: native | --oci | --push <ref>)" >&2
        exit 1
        ;;
esac
