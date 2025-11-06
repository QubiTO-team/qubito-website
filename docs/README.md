# Usage & Contribution Guide

## Usage

This documentation explains how to use and contribute to the QubiTO Team website.

If you want to modify specific pages, see:
- [Articles](pages/articles.md)
- [Activities](pages/activities.md)
- [Home Page](pages/home.md)
- [Linktree Page](pages/linktree.md)

These guides describe the structure and properties of each section.

### Running the site locally

Make sure you have Node.js (with npm) installed, then run `npm install` once in the project root. Use `npm run dev` whenever you need to run or test the website; it keeps `npm run tailwind:watch` active so Tailwind updates the compiled CSS automatically while Hugo serves the content.

## Contribution

We welcome contributions from both QubiTO Team members and external collaborators.

### QubiTO Team Members

If you are a member of the QubiTO Team:
- Please contact us to be added as a contributor.
- Once added, you can contribute by following these steps:

  1. **Create a new branch from `main`**  
     In your local repository, run:
     ```sh
     git checkout main
     git pull
     git checkout -b feature-branch-name
     ```
     Or create a branch from `main` using GitHub's web interface.

  2. **Make your changes on your branch**  
     Edit files, add content, or update documentation as needed.  
     Stage and commit your changes:
     ```sh
     git add .
     git commit -m "Describe your changes"
     ```

  3. **Push your branch to GitHub**  
     ```sh
     git push origin feature-branch-name
     ```

  4. **Create a Pull Request (PR) into `staging`**  
     On GitHub, open a Pull Request from your branch (`feature-branch-name`) into the `staging` branch (not directly into `main`).  
     This allows your changes to be reviewed before merging.

If you need help with these steps, please contact the team for guidance.

### External Contributors

If you are not part of the QubiTO Team but wish to contribute:
- Fork the repository on GitHub.
- Make your changes in your fork.
- Create a pull request to propose your changes.

Thank you for helping us improve the QubiTO Team website!
