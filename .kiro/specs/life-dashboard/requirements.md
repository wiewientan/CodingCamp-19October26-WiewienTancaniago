# Requirements – To-Do List Life Dashboard

## Introduction
A simple dashboard that helps users organize their day. It shows the time, a to-do list, a focus timer and quick links to websites. Built with HTML, CSS and vanilla JavaScript; all data is saved in Local Storage.

## Requirement 1: Greeting
**User story:** As a user, I want to see the current time, date and a greeting so I know where I am in my day.

Acceptance criteria:
1. WHEN the page is open THEN the system SHALL show the current time and update it every second.
2. The system SHALL show the current date (weekday, day, month, year).
3. The system SHALL show a greeting based on the time of day (morning 05–11, afternoon 12–16, evening 17–20, night 21–04).

## Requirement 2: Focus Timer
**User story:** As a user, I want a 25-minute focus timer so I can work in focused sessions.

Acceptance criteria:
1. The timer SHALL default to 25 minutes.
2. WHEN the user clicks Start THEN the timer SHALL count down.
3. WHEN the user clicks Stop THEN the timer SHALL pause at the current time.
4. WHEN the user clicks Reset THEN the timer SHALL return to the full session length.
5. WHEN the timer reaches 00:00 THEN the system SHALL play a short sound and show "Done".

## Requirement 3: To-Do List
**User story:** As a user, I want to manage my tasks so I can keep track of what to do.

Acceptance criteria:
1. The user SHALL be able to add a task.
2. The user SHALL be able to edit a task (edit button or double-click).
3. The user SHALL be able to mark a task as done / not done.
4. The user SHALL be able to delete a task.
5. Tasks SHALL be saved in Local Storage and restored on reload.

## Requirement 4: Quick Links
**User story:** As a user, I want buttons to my favorite websites so I can open them quickly.

Acceptance criteria:
1. Each link SHALL open its website in a new tab.
2. The user SHALL be able to add a link (name + URL) and remove a link.
3. Links SHALL be saved in Local Storage.

## Challenges (3 required, all 5 implemented)
1. **Light / Dark mode** – a toggle that switches the theme and remembers the choice.
2. **Custom name in greeting** – click the name in the greeting to change it; saved in Local Storage.
3. **Change Pomodoro time** – session length adjustable from 1 to 120 minutes; saved in Local Storage.
4. **Prevent duplicate tasks** – adding or editing a task to a name that already exists (ignoring case and extra spaces) shows an error.
5. **Sort tasks** – newest, oldest, A→Z, or unfinished first; the choice is remembered.
