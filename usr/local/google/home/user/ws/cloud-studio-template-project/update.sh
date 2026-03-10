#!/bin/bash
# A script to add, commit, and push local changes to the remote repository.

# Get the commit message from the first argument
MESSAGE="$1"

# If no message is provided, ask for one
if [ -z "$MESSAGE" ]; then
  echo "Enter a commit message:"
  read MESSAGE
fi

echo "Adding all local changes..."
git add .

echo "Committing with message: '$MESSAGE'"
# Use --allow-empty-message in case the message is empty.
git commit -m "$MESSAGE"

echo "Pushing to the 'main' branch..."
git push origin main

echo "✅ Successfully updated the remote repository."
