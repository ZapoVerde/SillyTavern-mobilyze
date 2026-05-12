# Mobilyze

### Stop fighting the interface and start reading your stories.

Mobilyze is a SillyTavern extension designed to transform the mobile chatting experience. It reclaims every possible pixel of screen real estate by hiding the top menu and forcing a "mobile-first" layout that stays readable on any screen -- from the smallest phone to the largest tablet.

Mobilyze ships with translations for English, Simplified Chinese, Spanish, and Portuguese. Additional translations available on request.

## What Mobilyze Does for You

*   **Maximizes Chat Space:** The top menu bar automatically slides out of view when you start reading, giving you back 15% more vertical space.
*   **Message Navigation Buttons:** Discrete, floating up and down buttons on the right edge of the screen allow you to "step" through messages one-by-one. It’s the perfect way to navigate long chat logs without endless swiping.
*   **Improved Readability on Tablets:** On wider screens, chat messages are centered and limited in width so text stays easy to read instead of stretching across the screen.
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
| **Disable on desktop screens** | When checked, Mobilyze automatically deactivates whenever the viewport is wider than 1000 px and reactivates when you resize back to mobile width. Useful if you use SillyTavern on both a phone and a desktop browser. |
| **Enable text wrapping under avatars** | Allows message text to flow behind the character avatars. |
| **Show message navigation buttons** | Toggles the floating up/down navigation buttons on the side of the chat. |
| **Reveal Triggers** | Individually toggle **Scroll up**, **Edge swipe**, or **Pull-tab** as your preferred menu triggers. |
| **Auto-hide delay** | Controls how long the bar stays visible (1000ms to 10000ms). |
| **Auto-hide Menu on tall screens** | By default, Mobilyze triggers on screens under 1000px tall. Enable this to force mobile behavior on large desktop monitors. |
| **Pull-tab visibility** | **Standard** for a visible grey handle; **Subtle** for a minimalist, low-opacity outline. |
| **Hide navigation controls on load screen** | Hides the navigation buttons and swipe controls when no character is actively loaded. |
| **Enable debug logging** | Only needed if you are reporting a bug to the developers. |