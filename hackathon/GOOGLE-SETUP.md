# Google Form for the applications: what to change and what to do

The team already built the application form in **Google Forms** ("QubiTO Quantum Hackathon Application Form",
screenshots in `utils/pngs/`). Plan: **keep their Google Form** as the official application, and make the
"Apply" buttons on the website open it.

Why: Google Forms already saves every answer in a Sheet, can email each applicant a copy of their answers
(sent by Google, so it doesn't use the 100-emails-a-day Gmail limit), and the team can edit questions
without touching the website. The site's own 4-step form and the Apps Script are then not needed for
applications (`apps-script/hackathon.gs` stays as a backup option).

Work logged in as **teamqubito@gmail.com**, ideally in a separate browser profile.

---

## A. Changes to the questions

Must do:

1. **Privacy consent (missing, required by law).** Add at the end a *Checkboxes* question, required,
   with one option:
   > I have read the privacy notice (https://qubito.polito.it/hackathon/privacy/) and agree to the
   > processing of my data for this application.
2. **Photo consent (missing), optional.** A separate *Checkboxes* question, **not** required:
   > Optional: I agree that photos and videos of me taken during the event may be published by QubiTO
   > on its website and social media.
3. **Dietary restrictions: make it optional** (now it's required). Allergies and some diets count as
   sensitive data, so people must be free not to answer. Add the description:
   "Only used for catering. Leave empty if none."
4. **Motivational statement: change type to *Paragraph*** (now it's *Short answer*, a single line).
   Optionally ⋮ → *Response validation* → *Length* → *Minimum character count* 200.
5. **"Any extra information": also *Paragraph*.**
6. **Fix the typo** in all the 1–5 scales: right label "Experienced/Researche" → "Experienced / Researcher".
7. **Email:** don't use the "Email" short-answer question. Instead see B.1 (Google's own email field,
   which checks the address and makes the automatic confirmation possible). Then delete the "Email" question.

Nice to have:

8. "How did you hear about the hackathon?" (optional, multiple choice: Instagram, LinkedIn, friends,
   professor, university mailing list, other). Useful to know where to advertise next time.
9. Optional "GitHub or LinkedIn profile" (short answer). Helps with selection.
10. Don't ask now for ID or student number for building access: ask only the accepted participants, by
    email, if PoliTo security needs it (collect only what's needed).

## B. Settings (gear / *Settings* tab)

1. *Responses* → **Collect email addresses: Responder input**.
   *Send responders a copy of their response:* **Always**. That's the automatic confirmation email.
2. *Responses* → **Limit to 1 response: OFF** (it would force everyone to log in with a Google account;
   duplicates are easy to spot in the Sheet by email).
3. *Presentation* → **Confirmation message**, e.g.:
   > Thanks for applying to the QubiTO Quantum Hackathon! You'll receive a copy of your answers by email.
   > We'll review all applications after 15 November and email you the result. Teams of 4 are formed on
   > site on 12 December. Questions: teamqubito@gmail.com
4. *Presentation* → show progress bar: ON (two sections).

## C. Responses and the Sheet

1. *Responses* tab → **Link to Sheets** (if not already linked) → the existing Sheet or a new one.
2. *Responses* tab → ⋮ → **Get email notifications for new responses** (to teamqubito).
3. Share the **Sheet** only with the organisers who need it. **General access: Restricted.**
4. **Closing on 15 November at 23:59:** *Responses* tab → turn **Accepting responses** off.
   If your Forms shows an option to schedule a close date/time there, use it; otherwise set a reminder,
   or use the free add-on *formLimiter* (closes the form at a date).
   The website hides the Apply button by itself at the deadline (already set in `src/config.ts`).

## D. Test

1. Open the form's public link in a private window, fill it in with your own email, submit.
2. Check: the confirmation message, the email copy of your answers, the notification to teamqubito,
   the new row in the Sheet.
3. Delete the test response (*Responses* tab → individual response → delete) and the row in the Sheet.

## E. Connect it to the website (done)

The site uses https://forms.gle/BLngupimND7nxq7R7 (`APPLICATION_FORM_URL` in `src/config.ts`): the
navbar "Apply", the hero "Apply now" and the card in the Apply section open it in a new tab. The partner
"Get in touch" button opens an email to teamqubito. If the Form link ever changes, update `src/config.ts`.

## F. Still to decide

- **Date results are sent** (shown on the site and in the confirmation message).
- The form says "Space is limited" (fine, the number of places stays undisclosed).
