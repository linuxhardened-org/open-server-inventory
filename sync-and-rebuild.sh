#!/bin/bash

# ServerVault Sync & Rebuild Script
# Automates the process of pulling from upstream, pushing to origin, and rebuilding containers.

# Exit on any error
set -e

echo "🚀 Starting ServerVault update process..."

# 1. Fetch from upstream
echo "📥 Fetching updates from upstream..."
git fetch upstream

# 2. Merge changes into current branch (assumes main)
echo "🔀 Merging upstream/main..."
git merge upstream/main

# 3. Push to your origin
echo "📤 Pushing synchronized state to origin main..."
git push origin main

# 4. Rebuild and restart containers
echo "🛠️ Rebuilding Docker containers..."
docker-compose down
docker-compose up --build -d

echo "✅ Update complete! ServerVault is running at http://localhost:8080"
