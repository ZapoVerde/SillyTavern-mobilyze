Here is the updated `README.md` with the specific installation instructions and GitHub URL included.

***

# Mobilyze

### Stop fighting the interface and start reading your stories.

Mobilyze is a SillyTavern extension designed to transform the mobile chatting experience. It reclaims every possible pixel of screen real estate by hiding bulky navigation bars and forcing a "mobile-first" layout that stays readable on any screen—from the smallest phone to the largest tablet.

## What Mobilyze Does for You

*   **Maximizes Chat Space:** The top navigation bar automatically slides out of view when you start reading, giving you back 15% more vertical space.
*   **The "Comfort Width" Layout:** No more awkward stretching. Chat messages are clamped to a maximum width of 800px and centered. This keeps text lines at a readable length on tablets while remaining full-width on phones.
*   **Smart Message Wrapping:** Text now flows *under* avatars instead of being squeezed into a narrow column next to them. This makes message bubbles feel more spacious and natural.
*   **Fixes "Stuck" Side Panels:** Forces the left and right drawers to behave on mobile, ensuring they never overlap your chat or get stuck in a three-column desktop view.

---

## Navigating with Mobilyze

When the top bar is hidden, you can bring it back instantly using any of these three intuitive gestures:

1.  **Swipe Down:** Drag your finger down from the very top edge of the screen.
2.  **Scroll Up:** Simply scroll back up through your message history; the bar will slide back down so you can access your menu.
3.  **The Pull-Tab:** A small, discrete handle appears at the top-center of the screen. Tap or drag it to reveal the menu.

The bar will automatically hide itself again after a few seconds of inactivity (customizable in settings). If you open a side panel, the bar stays pinned until you close the panel.

---

## Installation

1.  Open SillyTavern and click the **Extensions** icon (the three stacked blocks) in the top navigation bar.
2.  Click the **Install extension** button.
3.  Paste the following URL into the "Enter the Git URL" input box:
    `https://github.com/ZapoVerde/SillyTavern-mobilyze`
4.  Click **Install just for me** (or **Install for all users**).
5.  Once the installation finishes, find **Mobilyze** in your extensions list and ensure "Enable mobile layout" is checked.

---

## Settings

Find the Mobilyze configuration in the SillyTavern Extensions drawer:

| Setting | Default | Description |
| :--- | :--- | :--- |
| **Enable mobile layout** | On | The master switch. Turns on the auto-hiding bar and layout fixes. |
| **Auto-hide delay** | 4000ms | Controls how long the bar stays visible before sliding away. |
| **Enable debug logging** | Off | Only needed if you are reporting a bug to the developers. |

**Note:** Mobilyze is designed to activate automatically whenever your screen height is less than 1000px. On large desktop monitors, the extension remains dormant to preserve the standard desktop experience.