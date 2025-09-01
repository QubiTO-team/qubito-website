# Home Page Structure & Editing Guide

The home page of the QubiTO Team website is defined in the Hugo template at `layouts/partials/home/custom.html` and is configured using parameters in the site's configuration files (usually in `config/_default/params.toml`).

## Structure

The home page is composed of several main sections:

1. **Background & Hero Section**
   - Animated background elements.
   - Main title (`overview-title`) animated with TypeIt.
   - Subtitle and description (`overviewSubtitle`, `overviewDescription`).
   - Keywords (optional, currently commented out).
   - Scroll-down indicator.

2. **Who We Are Section**
   - Title and description (`whoWeAreTitle`, `whoWeAreDescription`).
   - Button (from `snippets/whoWeAreButton`).
   - Image (`whoWeAreImage`).

3. **Activities Section**
   - Title and description (`activitiesTitle`, `activitiesDescription`).
   - Recent activities (from `partials/recent-activities.html`).
   - Activities button (from `snippets/activitiesButton`).

4. **Recent Articles Section**
   - Displays recent articles (from `partials/recent-articles/main.html`).

5. **Contact Section**
   - Title and description (`contactTitle`, `contactDescription`).
   - Contact button (from `snippets/contactsButton`).

## How to Update the Home Page

- **Text Content:**  
  Update the relevant parameters in `config/_default/params.toml` (or your language-specific config file).  
  Example:
  ```toml
  overviewSubtitle = "Quantum Computing at Politecnico di Torino"
  overviewDescription = "Welcome to the official QubiTO Team website."
  whoWeAreTitle = "Who We Are"
  whoWeAreDescription = "We are a student team passionate about quantum technologies."
  whoWeAreImage = "/images/team-photo.jpg"
  activitiesTitle = "Our Activities"
  activitiesDescription = "Discover our latest events and projects."
  contactTitle = "Contact Us"
  contactDescription = "Get in touch with the QubiTO Team."
  ```

- **Buttons & Snippets:**  
  Edit the content in the corresponding snippet files under `content/snippets/` (e.g., `whoWeAreButton`, `activitiesButton`, `contactsButton`).

- **Images:**  
  Update image paths in the parameters or replace images in the `static/images/` directory.

- **Sections:**  
  To add, remove, or rearrange sections, edit the template file at `layouts/partials/home/custom.html`.

- **Activities & Articles:**  
  These are rendered using partials and pull data from `content/activities/` and `content/articles/`.  
  To update, add or edit entries in those folders.

## Tips

- Use Hugo's multilingual features for different languages by providing language-specific config files and content.
- For advanced customization, modify the HTML and CSS in the template and theme files.
- For animations and interactive elements, update the JavaScript in `custom.html`.

For more details, see the [Blowfish documentation](https://blowfish.page/docs/).
