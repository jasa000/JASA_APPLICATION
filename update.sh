#!/bin/bash
# A script to forcefully update the remote repository with local changes.

# --- WARNING ---
# This script uses 'git push --force'.
# This command OVERWRITES the history of the remote branch.
# Use with caution. It is suitable for personal projects where you are the
# only contributor and want your local version to be the source of truth.
# Do NOT use this in a collaborative project without coordinating with your team.

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
# Use --allow-empty-message in case the message is empty, though we prompt for it.
# The main goal is to capture the state, even if the message isn't descriptive.
git commit -m "$MESSAGE"

echo "Force pushing to the 'main' branch..."
# The --force flag will overwrite the remote history with your local history.
git push origin main --force

echo "✅ Successfully updated the remote repository."
