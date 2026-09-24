#!/usr/bin/env bash
# Build the TINA worker image.
#
# The worker is CPU-only (no GPU/ML code), so it builds cleanly for both
# linux/amd64 and linux/arm64 — one image that runs on Windows, Linux and
# macOS via Docker Desktop's Linux VM.
#
# Modes:
#   ./build-multiarch.sh          native arch, loaded into the local docker
#                                 image store (ready for `docker compose up`).
#   ./build-multiarch.sh --oci    both arches exported to a portable OCI
#                                 tarball (tina-worker-multiarch.oci.tar) you
#                                 can copy to another machine.
#   ./build-multiarch.sh --push <ref>
#                                 both arches built and pushed as a multi-arch
#                                 manifest to registry <ref>.
#
# Note: a multi-arch manifest cannot live in the plain local docker image
# store — buildx needs --push (registry) or --output type=oci (tarball) to
# materialize both arches at once. For everyday local use, the default mode
# (or `docker compose build worker`) builds the correct native arch.
set -euo pipefail
cd "$(dirname "$0")"

IMAGE=tina-worker:latest
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
        docker buildx build --load -t "$IMAGE" .
        ;;
    --oci)
        out=tina-worker-multiarch.oci.tar
        echo "Building $IMAGE for $PLATFORMS -> $out ..."
        docker buildx build --platform "$PLATFORMS" -t "$IMAGE" \
            --output "type=oci,dest=$out" .
        echo "Wrote $out"
        ;;
    --push)
        ref="${2:?usage: build-multiarch.sh --push <registry/image:tag>}"
        echo "Building and pushing $ref for $PLATFORMS ..."
        docker buildx build --platform "$PLATFORMS" -t "$ref" --push .
        ;;
    *)
        echo "unknown mode '$mode' (expected: native | --oci | --push <ref>)" >&2
        exit 1
        ;;
esac
