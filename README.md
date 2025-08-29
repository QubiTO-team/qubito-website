# QubiTO Website

## Table of Contents
- [About the Project](#about-the-project)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Usage & Contribution](#usage--contribution)
- [License](#license)

## About the Project

This is the official website of the QubiTO Team at Politecnico di Torino University. The site showcases the team's activities, events, and resources related to quantum computing and research.

## Tech Stack

- **Hugo**: Hugo is a fast and flexible static site generator written in Go. It allows us to build and manage all the website content, structure, and routing efficiently. Hugo's speed and simplicity make it ideal for collaborative academic projects, and its support for multilingual content is essential for our international team.
- **Blowfish**: Blowfish is a modern, feature-rich Hugo theme that provides advanced layouts, responsive design, and extensive customization options. We use Blowfish to ensure our website looks professional and is easy to navigate, while also allowing us to quickly adapt the design to our needs.

## Getting Started

1. **Install [Node.js](https://nodejs.org/) and [Hugo](https://gohugo.io/getting-started/installing/):**
   - You need both Node.js and Hugo installed on your system.

2. **Clone the repository with submodules:**
   ```sh
   git clone --recurse-submodules https://github.com/QubiTO-team/qubito-website.git
   ```

3. **Run the project using one of the following:**

   - **With Blowfish tools:**  
     Run the following command and select **"Run a local server with Blowfish"** when prompted:
     ```sh
     npx blowfish-tools
     ```

   - **With Hugo directly:**
     ```sh
     hugo server
     ```

   This will start a local server, usually at [http://localhost:1313](http://localhost:1313).

## Usage & Contribution

For usage instructions and contribution guidelines, see [docs/README.md](docs/README.md).

## License

See [LICENSE](LICENSE) for details.

See [CREDITS](CREDITS.md) for attribution of third-party projects.
