# Contributor's Guide
This web application is built using Flask and Next.js, orchestrated with Docker, and will be deployed on AWS Elastic Beanstalk.

The project is open-sourced and designed to foster collaboration and learning amongst junior developers. Beginner programmers and first time open-source contributors are welcome!

## Licensing and Usage

By contributing to this project, you agree to abide by its [LICENSE](LICENSE):

## Getting Started

Please join the project Discord [channel](https://discord.gg/TDSBsXj6Ck) and reach out me (Bella Huang, Lead Developer & Project Manager) to indicate your interest.

## Setup Instructions

1. Ensure you have [git](https://git-scm.com/downloads) and [docker](https://www.docker.com/) installed
2. Create a fork of this repository
3. Clone your forked version of the repository
```bash
git clone https://github.com/<your-github-username>/utkc-tournament-planner.git
cd utkc-tournament-planner
```
4. (Optional, but recommended) Create a virtual environment
```bash
python3 -m venv <env_name>
source <env_name>/bin/activate
```
5. Install dependencies
* Frontend
```bash
cd client
npm install
```

6. Start the app by running `npm run dev`
7. Navigate to `http://localhost:3000/` to view the app in action!

## Before Development

1. Find your github issue
2. Make sure you are on the `main` branch (change branches using `git checkout`)
3. Create your branch accordingly, using the issue number (see [Branch Naming Conventions](#branch-naming-conventions))

## Branch Naming Conventions

To maintain a clear and organized Git history, please follow these naming conventions when creating branches:

### General Guidelines
1. Use lowercase letters only.
2. Separate words with hyphens (`-`) for readability.
3. Keep names descriptive but concise.
4. Include a prefix to indicate the type of work being done, as well as the issue number


### Branch Prefixes

| Prefix      | Purpose                              | Example                              |
|-------------|--------------------------------------|--------------------------------------|
| `feature/`  | New features or enhancements         | `feature/1-add-user-authentication`    |
| `bug/`      | Fixes for bugs or issues             | `bug/2-fix-login-redirect`          |
| `refactor/` | Refactoring or code improvements     | `refactor/3-clean-dashboard-component` |
| `docs/`     | Documentation updates or changes     | `docs/4-update-readme-contributing`    |
| `test/`     | Adding or updating tests             | `test/5-add-api-test-coverage`         |
| `build/`    | Build components (e.g., CI/CD)   | `build/6-update-dependencies`          |
| `chore/`    | Miscellaneous tasks   | `chore/7-modify-gitignore`          |



## During Development
- Don't forget to sync your fork often!
- **tip:** use `git status` to see what files you have edited and what branch you are on
- **TALK TO EACH OTHER!** Your components wil interact with other components through state and callbacks. Contact other teams to agree on how you plan to implement/control the state of your/other team's components

## Pushing Working Changes
1. Make sure your changes are working
2. Make sure you are on an appropriate branch
    * To view existing branches: `git branch`
    * To switch to an existing branch: `git checkout <branch_name>`
    * To create a new branch and switch to it: `git checkout -b <branch_name>`
3. Add the appropriate files to commit: `git add <file_name>` (or `git add .` to commit all changes)
4. Create a new commit: `git commit -m "<quality message>"`
5. Push the commit to GitHub: `git push`

## Learning Resources

[Flask Routing Tutorial](https://www.youtube.com/watch?v=27Fjrlx4s-o)


[CSS Tutorial](https://www.youtube.com/watch?v=yfoY53QXEnI)


[CSS Flexbox Tutorial](https://www.youtube.com/watch?v=u044iM9xsWU)


[CSS Flexbox Cheatsheet](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)


[Refactoring UI](https://www.refactoringui.com/)


[MDN Docs](https://developer.mozilla.org/en-US/)
