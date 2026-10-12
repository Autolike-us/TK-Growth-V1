# Changelog

## 1.5.1
- Starting a task now reuses the TikTok tab you already have open instead of opening a new one.
- Comments: waits for TikTok to show its own comment panel before clicking the (toggle) comments icon, retries the icon, and records what the page rendered if the box is lost.

## 1.5.0
- New: the form is remembered when the popup closes, a Reset to defaults button, and named saved setups (save, load, rename, delete).

## 1.4.2
- Fix: broader comment-box detection (any TikTok comment editor, not only tagged ones), waits for the video page to settle before typing, reopens the comments panel if TikTok closes it.

## 1.4.1
- Fix: comment box, Post button and comment rows are now found even when TikTok renders the comments panel outside the main video container ("comment box disappeared while typing").

## 1.4.0
- **Captcha handling.** Aurora now notices TikTok captchas (sized captcha widgets, captcha wording on screen outside comments and captions, and captcha dialogs). It pauses, brings the TikTok tab to the front, notifies you and asks you to solve it; once it is solved in that tab, the task continues by itself. Identity checks and "slow down" warnings are reported separately and need a manual Resume.
- **Human-like typing.** Comments are typed one character at a time with an uneven rhythm and thinking pauses (capped at about 90 seconds); line breaks become spaces; typing is checked before Post is pressed.
- A human-length pause (about 1–2.5 s) before every action.
- Fixed: a multi-line comment could not be confirmed as posted.

## 1.3.1
- **Fixed: comments were skipped as "disabled".** TikTok keeps the comments panel closed until you click the speech-bubble button; Aurora now opens it when it cannot find the comment box, then continues. If comments really are off, it still skips with a clear message.
- **Fixed: false "verification requested" stops.** A captcha now counts only when it is actually on screen with a real size and content; empty captcha placeholders that the page keeps around no longer stop the task. When a warning does stop a task, the debug log names the element that triggered it.
- Check page now also reports whether the comment box and the comments button are found.

## 1.3.0
- **Faster start.** The pacing wait now applies after each action, not after reading a profile or skipping a post, so the first action begins about 10 seconds after you press Start instead of waiting a full delay first. The wait between actions is unchanged (never shorter than your setting, plus the random extra).

## 1.2.2
- **Fixed: Aurora could pick videos that were not on the target profile** (for example your own video linked from a side panel) and try to act on them. Profile steps now read only the profile's own video grid, and only videos by that profile.
- **Your own posts are never liked or commented on**; they are skipped with a message.
- A numeric account id in a video address (TikTok accepts both) no longer fails the author check; the matching video id is the proof.

## 1.2.1
- **Fixed: a comment could be posted but then reported as unconfirmed** when TikTok replaced the comment box while typing. Aurora now looks the box up fresh each time and confirms against the live page.
- Page helpers no longer throw when an element disappears mid-step; the debug log now includes the page-side error stack.

## 1.2.0
- **Photo posts** (`/photo/` links) are now supported alongside videos. A photo post with no Like control is skipped with a clear message instead of pausing the task.
- **Debug log**: a rolling activity log with a one-click **Copy report** (studio tab, paused banner and on-page panel). Failed steps record a page trace and the Check page report automatically.

## 1.1.0
- Task finishes immediately at the action limit (no extra wait before the "finished" alert).
- Wait between steps is never shorter than the setting, with a random 0–40% extra.
- Optional daily action cap.
- Alerts: one status notification (replaced, not stacked) with a one-click **Resume** for load-type pauses; toolbar badge; Resume/Stop banner; pulsing on-page button.
- The page-warning scan only looks at dialogs, alerts, toasts and captcha widgets, at most every 1.5 s (no more false stops from comments, much lighter on busy pages).
- Content script is re-attached automatically if the tab was opened before the extension reloaded.
- Signed-in user is also read from TikTok's page data when the side-menu link is missing.
- **Check page** report in the on-page panel.
- Progress line ("N steps left · about M min"), **Clear history**, history capped at 5,000, receipts pruned after 90 days (comments kept), CSV export protected against spreadsheet formulas.
- `npm run package` builds an installable zip; tests run on GitHub for every push.

## 1.0.0
- Initial TikTok version: preview-first likes, follows, unfollows and comments with local history.
