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
   - Versions used by this project: Node.js `20.x` and Hugo `0.124.0` (see `.nvmrc` and `.tool-versions`).
   - **Node.js `20.x` via nvm (macOS/Linux):**
     ```sh
     curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
     # restart your shell, then:
     nvm install 20
     nvm use 20
     node -v
     ```
   - **Hugo `0.124.0` direct downloads (extended):**
     - **Linux (x64):**
       ```sh
       HUGO_VERSION=0.124.0
       curl -L -o /tmp/hugo.tar.gz "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_Linux-64bit.tar.gz"
       tar -xzf /tmp/hugo.tar.gz -C /tmp
       sudo install /tmp/hugo /usr/local/bin/hugo
       hugo version
       ```
     - **macOS (Apple Silicon):**
       ```sh
       HUGO_VERSION=0.124.0
       curl -L -o /tmp/hugo.tar.gz "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_macOS-ARM64.tar.gz"
       tar -xzf /tmp/hugo.tar.gz -C /tmp
       sudo install /tmp/hugo /usr/local/bin/hugo
       hugo version
       ```
     - **macOS (Intel):**
       ```sh
       HUGO_VERSION=0.124.0
       curl -L -o /tmp/hugo.tar.gz "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_macOS-64bit.tar.gz"
       tar -xzf /tmp/hugo.tar.gz -C /tmp
       sudo install /tmp/hugo /usr/local/bin/hugo
       hugo version
       ```
     - **Windows (x64, PowerShell):**
       ```powershell
       $HUGO_VERSION="0.124.0"
       Invoke-WebRequest -Uri "https://github.com/gohugoio/hugo/releases/download/v$HUGO_VERSION/hugo_extended_${HUGO_VERSION}_Windows-64bit.zip" -OutFile "$env:TEMP\\hugo.zip"
       Expand-Archive -Path "$env:TEMP\\hugo.zip" -DestinationPath "$env:TEMP\\hugo"
       New-Item -ItemType Directory -Force -Path "$env:ProgramFiles\\Hugo" | Out-Null
       Move-Item "$env:TEMP\\hugo\\hugo.exe" "$env:ProgramFiles\\Hugo\\hugo.exe"
       $env:PATH += ";$env:ProgramFiles\\Hugo"
       hugo version
       ```

2. **Clone the repository with submodules:**
   ```sh
   git clone --recurse-submodules https://github.com/QubiTO-team/qubito-website.git
   ```

3. **Install the JavaScript tooling that powers the Tailwind build:**
   ```sh
   npm install
   ```

4. **Run the project locally:**

   - **Recommended for development and testing:**
     ```sh
     npm run dev
     ```
     This command ensures `npm run tailwind:watch` stays active so Tailwind regenerates CSS automatically while Hugo serves the site in development mode.

   - **With Blowfish tools:**  
     Run the following command and select **"Run a local server with Blowfish"** when prompted:
     ```sh
     npx blowfish-tools
     ```

   - **Alternate workflow:**  
     ```sh
     npm run start
     ```
     Similar to `npm run dev` but without the extra Hugo cache flags.

   - **With Hugo directly (one-off compile):**
     ```sh
     npm run hugo
     ```
     The `prehugo` script recreates `assets/css/compiled/main.css` before launching Hugo.

   This will start a local server, usually at [http://localhost:1313](http://localhost:1313).

   To produce a production build with a freshly generated Tailwind bundle, run:
   ```sh
   npm run build
   ```

## Usage & Contribution

For usage instructions and contribution guidelines, see [docs/README.md](docs/README.md).

## License

See [LICENSE](LICENSE) for details.

See [CREDITS](CREDITS.md) for attribution of third-party projects.
