#!/bin/bash
# Script to completely reset git history and start fresh with current code.

echo "⚠️  WARNING: This will PERMANENTLY delete all previous git commit history."
echo "Are you sure you want to continue? (y/n)"
read confirm

if [ "$confirm" != "y" ]; then
    echo "Aborting."
    exit 1
fi

REPO_URL="https://github.com/jasaessential/JASA_WEBAPP.git"

echo "Cleaning up local git history..."
rm -rf .git

echo "Initializing new git repository..."
git init

echo "Adding current files..."
git add .

echo "Creating initial commit..."
git commit -m "Initial commit (clean start - secrets removed)"

echo "Connecting to remote origin: $REPO_URL"
git remote add origin "$REPO_URL"

echo "Setting default branch to 'main'..."
git branch -M main

echo "Force pushing to remote repository..."
echo "This will overwrite all history on the remote 'main' branch."
git push -u origin main --force

echo "✅ Successfully reset and force-pushed fresh code to $REPO_URL"
