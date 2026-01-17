\# LocalBiz Server – Dev Cheatsheet



\## One-time setup (already done)

\- repo cloned / created  

\- `main` set as default branch  

\- `node\_modules/` ignored  



\## Everyday branch → PR → merge cycle

1\. \*\*Start fresh\*\*  

&nbsp;  ```bash

&nbsp;  git switch main

&nbsp;  git pull origin main



&nbsp;   Create topic branch (never work on main)

&nbsp;   bash



Copy



git checkout -b feat/short-description

\# Example: git checkout -b feat/add-privacy-page



Code / test locally



&nbsp;   run node index.js

&nbsp;   check http://localhost:3000

&nbsp;   stop server with Ctrl-C when done



Stage \& commit

bash

Copy



git add .

git commit -m "feat: clear present-tense description"

\# Examples:

\# feat: add privacy policy page

\# fix: correct nav link on contact page

\# chore: update dev dependencies



Push branch to GitHub

bash

Copy



git push -u origin feat/short-description



Terminal prints a “Create a pull request” link.

Open the PR



&nbsp;   click the link (or go to repo → “Compare \& pull request”)

&nbsp;   leave title auto-filled or edit to match commit message

&nbsp;   add notes if needed; click “Create pull request”



Review \& merge on GitHub



&nbsp;   green “Merge pull request” → “Confirm merge”

&nbsp;   wait for purple “Merged” badge



Local cleanup

bash



&nbsp;   Copy



&nbsp;   git switch main

&nbsp;   git pull origin main        # now contains your merged changes

&nbsp;   git branch -d feat/short-description



&nbsp;   Delete remote branch (optional but tidy)

&nbsp;       GitHub shows gray “Delete branch” button after merge; click it



Useful extras



&nbsp;   check status any time

&nbsp;   bash



Copy



git status



see recent commits

bash

Copy



git log --oneline -5



abandon a branch (if you messed up)

bash

Copy



git switch main

git branch -D feat/broken-branch   # capital D forces delete



sync after a long break

bash



&nbsp;   Copy



&nbsp;   git switch main

&nbsp;   git pull origin main



Keep this file in repo; update whenever the workflow changes.

Copy





Save the file, then create a feature branch (`feat/add-dev-cheatsheet`), commit, push, and PR—same routine we just practiced.

