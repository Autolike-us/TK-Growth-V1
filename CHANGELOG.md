# Changelog

## 1.2.3 — Move or hide the Aurora button
- **Move it**: drag the floating Aurora button to any corner of the page. Aurora remembers the spot, and the panel opens up or down so it never goes off screen. Double-click the button to put it back.
- **Hide it**: a small × next to the button hides it. Turn it back on with the checkbox "Show the Aurora button on pages" in the toolbar popup. If a task pauses and needs you, the button still appears so you do not miss it.

## 1.2.2 — Follow + like fix
- Fixed: "Follow + like" on a hashtag, discover page or the Explore feed never liked anything — the follow pass used up the whole task limit first. It is now one pass: each video is liked and its author followed, then Aurora moves on. The limit counts videos, and the Live session shows how many were liked and followed.

## 1.2.1 — Explore feed
- **Explore feed** is a new source: Aurora opens TikTok's Explore page and walks its videos (like, comment, follow, or follow + like). No target needed. The personal For You page is not used because it cannot be read safely.

## 1.2.0 — Follow + like and different comments
- **Follow + like**: a new action. For profiles it follows each account and then likes its videos; for a hashtag or discover page it walks the page once to like and once to follow the authors; for video links it likes each video and follows its author. Both actions count toward the task limit and the daily cap.
- **A different comment on each video**: write one comment per line (up to 150 characters each) and tick the new box; Aurora picks one at random for each video and does not repeat a comment until all have been used.

## 1.1.0 — New popup and a fresher dashboard
- The toolbar popup is now a small status card: what is running, Pause / Stop, today's count against your daily limit, your license, and **Open dashboard**. It cannot start or resume anything.
- Everything else (new tasks, saved setups, history, debug log) lives in the full dashboard tab, which opens from the popup. It re-uses the tab if it is already open.
- The dashboard has a calmer look in light and dark, a fourth **Today** card and a Help & support link.
- Nothing about how tasks run has changed: previews, confirmations, pacing, receipts and pause-on-problems are exactly as in 1.0.1.

## 1.0.1
- New: Telegram channel "Aurora Studios Report" for bug reports, feature requests and ideas — linked in the footer of the studio and the toolbar popup (next to Report an issue and Contact us).

## 1.0.0
- Likes and comments now walk in place, like Facebook and Instagram: open the first video of a profile (or a hashtag / discover page such as /discover/printify-como-funciona-en-mexico), act, press TikTok's next-video arrow (Down key as a fallback), repeat. No more opening every video as its own page.
- Follow on a hashtag or discover page now follows each video's author in place (the Follow button in the open video), instead of opening every video and then every profile. Repeated authors and people you already follow are skipped.
- Follow from a followers/following list now happens in place: Aurora opens the list on the profile, presses Follow on each row (skipping people you already follow, request or exclude), scrolls for more and closes it. No profile pages are opened.
- Pace floor lowered to 5 seconds between steps (default 20).
- Preview works without a license; only live tasks need a key. The trial (3 days, no subscription or payment method) is advertised in the License box.
- "Report an issue" and "Contact us" open an email to support@getaurorastudios.com (the issue report copies the diagnostic report for you to paste).
- First public release, sold through getaurorastudios.com. Version numbering restarts at 1.0.0; everything listed below is included. The studio now enforces the license (3-day free trial, then a subscription) against https://getaurorastudios.com.

## 1.8.0
- License system (for selling Aurora): a License box in the studio/popup where the customer pastes their key; live tasks (Start/Resume/every step) are blocked without a valid trial or subscription, while Preview works without a key. License tokens are signed (ES256) by the Aurora website and checked offline; they refresh every 12 hours and work for up to 72 hours offline. Builds stay unlocked until you run `node scripts/configure-license.cjs --api https://your-site --jwk '{…public key…}'`, and `npm run package` refuses to build an unlocked zip (use `--dev` for a test build).

## 1.7.0
- The panel and the Live session card show the same progress line on every site: "Target 2 of 5 · @name · post 2/3 · next post in 24s · 1/9 done", a finished/current/upcoming target list, and a "Skip this target & continue" button when paused.
- The studio, popup and on-page panel now open in the light theme by default (the theme switch still remembers your choice).

## 1.6.1
- The Live session card and the on-page Aurora panel show a running counter again: actions done / limit, steps left and a countdown to the next step.

## 1.6.0
- Studio refresh (interface only; automation unchanged): always-visible PREVIEW/LIVE bar (LIVE tucks away after 2 s), the Live choice stays on until the task finishes or is stopped, fields the chosen action does not use are hidden, collapsible Pace & limits and Advanced sections, a one-line summary above Start, sidebar badges, activity filters and search, Saved setups under the Live session card, a real factory reset, a first-run checklist, Ctrl+Enter to start, a single scrollbar and no pinned bars in the popup, and a redesigned on-page Aurora panel.

## 1.5.4
- Comments: TikTok showed "Something went wrong" in the comments panel after the first typed character. Typing now places the caret inside the editor text leaf (not on the outer wrapper), clicks the box first, and switches the side panel from "You may like" to "Comments" when needed.

## 1.5.3
- Comments: the comments icon is now chosen as the one nearest the video on screen, pressed with a full pointer/mouse event sequence, and toggled up to 5 times (same icon, like a manual hide then show) when the panel vanishes; trace records the icon state.

## 1.5.2
- The popup closes and the on-page panel folds away once a task starts running.
- Comments: if TikTok closes the comment panel while typing, Aurora clicks the comments icon to bring it back (up to 4 tries, cycling icons), restores the text typed so far and carries on. The trace now records the page URL and what happens right after the first character.

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
