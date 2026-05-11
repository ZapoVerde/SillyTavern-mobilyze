
# Mobilyze

### Stop fighting the interface and start reading your stories.

Mobilyze is a SillyTavern extension designed to transform the mobile chatting experience. It reclaims every possible pixel of screen real estate by hiding bulky navigation bars and forcing a "mobile-first" layout that stays readable on any screen—from the smallest phone to the largest tablet.

## What Mobilyze Does for You

*   **Maximizes Chat Space:** The top navigation bar automatically slides out of view when you start reading, giving you back 15% more vertical space.
*   **Sequential "Jump Pill":** A discrete, floating navigation pill on the right edge of the screen allows you to "step" through messages one-by-one. It’s the perfect way to navigate long chat logs without endless swiping.
*   **Frosted Glass "Chassis Swipes":** Message swipe buttons have been redesigned into asymmetrical edge-tabs. They use a frosted-glass blur and sit flush against the screen boundaries, ensuring your chat text has the maximum possible horizontal width.
*   **The "Comfort Width" Layout:** Chat messages are clamped to a maximum width of 800px and centered. This keeps text lines at a readable length on tablets while remaining full-width on phones.
*   **Smart Message Wrapping:** Text flows *under* avatars instead of being squeezed into a narrow column next to them, making message bubbles feel more spacious and natural.
*   **Fixes "Stuck" Side Panels:** Forces the left and right drawers to stay contained within the chat width, preventing them from bleeding off-screen on mobile devices.

---

## Navigating with Mobilyze

When the top bar is hidden, you can bring it back instantly using three customizable triggers. You can enable or disable these individually in the settings:

1.  **Scroll Up:** Simply scroll back up through your message history; the bar will slide back down automatically.
2.  **Edge Swipe:** Drag your finger down from the very top edge of the screen (Touch devices only).
3.  **The Pull-Tab:** A small, discrete handle appears at the top-center. Tap or drag it to reveal the menu. Use the "Subtle" setting to make it nearly invisible for an ultra-clean look.

**Safety Note:** Mobilyze includes "lockout protection." You must keep at least one reveal trigger enabled so you never find yourself stuck with a hidden menu.

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

| Setting | Description |
| :--- | :--- |
| **Enable mobile layout** | The master switch. Turns on the auto-hiding bar and layout fixes. |
| **Enable text wrapping** | Allows message text to flow behind the character avatars. |
| **Show jump pill** | Toggles the floating up/down navigation buttons. |
| **Reveal Triggers** | Individually toggle **Scroll up**, **Edge swipe**, or **Pull-tab** as your preferred menu triggers. |
| **Auto-hide delay** | Controls how long the bar stays visible (1000ms to 10000ms). |
| **Auto-hide on tall screens** | By default, Mobilyze triggers on screens under 1000px tall. Enable this to force mobile behavior on large desktop monitors. |
| **Pull-tab visibility** | **Standard** for a visible grey handle; **Subtle** for a minimalist, low-opacity outline. |
| **Enable debug logging** | Only needed if you are reporting a bug to the developers. |

**Pro-Tip:** If you open a side panel (like Character Expressions or World Info), the top bar will stay pinned open until you close the panel, making it easier to navigate settings.