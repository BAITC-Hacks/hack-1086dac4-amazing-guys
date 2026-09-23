# hack-1086dac4-amazing-guys
Hackathon team repository for Amazing Guys

## Getting started

Clone the repository and open the folder in VS Code:

```sh
git clone https://github.com/BAITC-Hacks/hack-1086dac4-amazing-guys.git
cd hack-1086dac4-amazing-guys
```

If you already have this repository open, use the existing folder.

## Branches

- `main`: shared project changes after integration.
- `backend`: backend development.
- `frontend`: frontend development.

In VS Code, click the branch name in the bottom-left corner to switch to
your development branch. Pull the latest changes before starting work.

## Commit and merge workflow

1. Make your changes on `backend` or `frontend`.
2. In VS Code's Source Control panel, review and stage the intended files.
3. Enter a descriptive commit message, commit, and push the branch.
4. Open a GitHub pull request from your branch into `main`, review the changes,
   and merge when ready.
5. Update your development branch with the latest `main` before continuing:

   ```sh
   git fetch origin
   git switch backend
   git merge origin/main
   git push origin backend
   ```

   Replace `backend` with `frontend` when working on the frontend.

Keep API keys, passwords, and local environment files out of commits.
