#!/bin/bash
# A script to add, commit, and push local changes to the remote repository.

# Get the commit message from the first argument
MESSAGE="$1"

# If no message is provided, ask for one
if [ -z "$MESSAGE" ]; then
  echo "Enter a commit message for your changes:"
  read MESSAGE
fi

echo "Adding all local changes..."
git add .

echo "Committing with message: '$MESSAGE'"
git commit -m "$MESSAGE"

echo "Pushing changes to the 'main' branch..."
git push origin main

echo "✅ Successfully pushed all local changes to the remote repository."
