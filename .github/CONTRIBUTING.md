# Contributor's Guide
This web application is built using Flask and React, orchestrated with Docker, and will be deployed on AWS Elastic Beanstalk.

The project is open-sourced and designed to foster collaboration and learning amongst junior developers. Beginner programmers and first time open-source contributors are welcome!

***NOTE***: Never work on or push code to `main`. Use your issue branches!!

## Getting Started

Please reach out me (Bella Huang, Lead Developer & Project Manager) to indicate your interest.

## Setup Instructions

1. Ensure you have [git](https://git-scm.com/downloads) and [docker](https://www.docker.com/) installed
2. Clone this repository
```bash
git clone https://github.com/Bellahuang3715/utkc-tournament-planner.git
cd utkc-tournament-planner
```
3. (Optional) Create a virtual environment
```bash
python3 -m venv <env_name>
source <env_name>/bin/activate
```
4. Install dependencies
* Frontend
```bash
cd frontend
npm install
```
* Backend
```bash
cd backend  
pip install -r requirements.txt
```
5. Download the [.env](TBC) and put into the `{PROJECT_ROOT}/server` folder
6. Build the image using `docker-compose -f docker-compose.dev.yml build`
7. Start the server using `docker-compose -f docker-compose.dev.yml up`
8. Navigate to `http://localhost:3000/` to view the app in action!

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
| `bugfix/`   | Fixes for bugs or issues             | `bugfix/2-fix-login-redirect`          |
| `hotfix/`   | Urgent fixes for production          | `hotfix/3-correct-data-typo`           |
| `refactor/` | Refactoring or code improvements     | `refactor/4-clean-dashboard-component` |
| `docs/`     | Documentation updates or changes     | `docs/5-update-readme-contributing`    |
| `test/`     | Adding or updating tests             | `test/6-add-api-test-coverage`         |
| `other/`    | Non-functional tasks (e.g., CI/CD)   | `other/7-update-dependencies`          |


## During Development
- Don't forget to commit and push often!
- **tip:** use `git status` to see what files you have edited and what branch you are on
- **TALK TO EACH OTHER!** Your components wil interact with other components through state and callbacks. Contact other teams to agree on how you plan to implement/control the state of your/other team's components

* The `build` command should be ran after any packages are installed, so to be safe, run it every time you pull from GitHub (and whenever you install new packages)
* Hot reloading is enabled for both Flask and React, meaning you can make changes to your files, save them, and they'll be reflected on localhost
* If stuff seems really broken, run `docker system prune -a` then the usual command

## Pushing Working Changes
1. Make sure your changes are working
2. Make sure you are on an appropriate branch
    * To view existing branches: `git branch`
    * To switch to an existing branch: `git checkout <branch_name>`
    * To create a new branch and switch to it: `git checkout -b <branch_name>`
3. Add the appropriate files to commit: `git add <file_name>` (or `git add .` to commit all changes)
4. Create a new commit: `git commit -m "<quality message>"`
5. Push the commit to GitHub: `git push`
