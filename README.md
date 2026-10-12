# Aurora • TikTok Studio 1.2.2

Adapted from the current `main` branch of Autolike-us/IG-Growth-V1 (Aurora 2.0.0). This is a separate TikTok extension; install it in its own folder so Instagram settings and history remain separate. Complete readable source is included. No build or subscription is required.

## Install

1. Download this repository using **Code → Download ZIP**, then extract it (or clone it).
2. Open `chrome://extensions`, enable **Developer mode**, select **Load unpacked**, and choose the extracted repository folder containing `manifest.json` (usually `TK-Growth-V1-main`).
3. Open https://www.tiktok.com/, sign in normally, and use TikTok in English.
4. Click the extension toolbar icon for the popup, or the floating Aurora button on TikTok and **Open full studio**.
5. Start with **Preview only** and an action limit of **1**. Check the target and result in the dedicated task tab. Preview does not like, follow, unfollow, or type/post comments.
6. When ready, uncheck Preview only and review the live-action confirmation. Keep the dedicated tab open while a task runs.

## Actions and discovery

- **Like videos**: works on a video's own heart control, skips already liked videos, and requires a readable like state before clicking.
- **Follow accounts**: uses entered/discovered profiles or authors of discovered videos. Already followed/requested accounts are skipped.
- **Unfollow**: only the explicit profile list you enter. Other discovery sources are disabled. Handles a direct state change or an Unfollow confirmation dialog.
- **Comment**: posts your exact text, up to 150 characters. Existing drafts are preserved. A persistent receipt prevents repeated comment attempts on the same video per signed-in account, including uncertain attempts.
- **Profiles**: usernames, @usernames, or full `https://www.tiktok.com/@username` links, separated by commas/whitespace.
- **Direct post links**: full `https://www.tiktok.com/@username/video/123456789` or `.../photo/123456789` URLs. Short share links are not accepted; open them in TikTok and copy the full video address.
- **Hashtag**: `#travel`, `travel`, or `https://www.tiktok.com/tag/travel`.
- **Followers/following**: one profile; reads an available rendered list. TikTok may hide or restrict these lists.
- **Commenters**: one full video URL; collects authors of visible comment rows.

Discovery is bounded to your selected limit, at most 20 scroll attempts, and stops after three scans without new results. Profiles/video lists may expose fewer items. No hidden data or private API is used. Exclusions, action limits, at least 30 seconds between steps, settings, theme switching, pause/resume/stop, local history, and CSV history export are included.

TikTok does not share Instagram's place feeds or liker-list interface, so those sources are omitted. Post-age and skip-video filters are unavailable in this version. No DMs, scheduling, or guaranteed follower growth is included.

## Alerts when a task stops

When a task pauses (sign-in, verification, TikTok layout problem, restart) Aurora shows a desktop notification, turns the toolbar icon badge red (`!`), pops open the on-page panel with a pulsing red button, and shows a **Resume / Stop** banner in the studio and popup. A green `ON` badge means a task is running and `✓` means it finished. Page-load timing errors that happen before any click are retried automatically up to 3 times.

## Interruption and verification

Preview resets on when the studio opens or the action changes. Errors and detected sign-in, verification, or activity restrictions pause execution. Pause/stop cannot undo a click already sent. Browser/extension restarts pause active tasks. If a worker was interrupted during a live action, its outcome is unknown: inspect TikTok manually, stop the task, and create a new task for the remaining targets. The extension will not automatically resubmit that interrupted step.

Live actions require the extension to identify the signed-in account and target. Unsupported layouts or unreadable controls fail closed. Use English and check a one-target preview first; selectors may need updates for TikTok experiments or changes. Comment receipts acknowledge the rendered interface, not guaranteed final server delivery.

This build is checked by 48 unit tests (`npm test`) and 62 isolated-Chromium browser fixtures (`npm run test:browser`, set `CHROMIUM_PATH` if Chromium is not found), and the same checks run on GitHub for every push. No live account actions were submitted by the tests. End-to-end operation as an installed extension on the live TikTok website remains your own check: start with Preview and a limit of 1. The browser fixtures simulate TikTok layouts and Chrome extension APIs; they do not prove compatibility with every live layout.

## Pacing, caps and limits

- The wait between steps is **never shorter than the seconds you set**; Aurora adds a random 0–40% on top so the rhythm is not mechanical.
- **Daily action cap** (optional, 0 = off): live actions are counted per day across tasks, and the task pauses when the cap is reached.
- **Videos and photo posts** are both processed. Photo layouts can differ from videos: if a photo post has no Like control Aurora skips it with a clear message instead of stopping (use **Check page** if that repeats).
- History keeps the most recent 5,000 entries (use **Clear history** to empty it). Old like/follow receipts are dropped after 90 days; comment receipts are kept so a comment is never sent twice.

## Debug log (for support)

Open the studio and choose **Debug log**. Aurora keeps a rolling record (last 1,500 events) of what it did: task start, each step, retries, skips, pauses and errors. When a step fails it also records what the page looked like at that moment (the **Check page** report plus a short trace).

- **Copy report** puts a ready-to-paste report on your clipboard (also available as **Copy error report** on the paused banner and in the on-page panel). **Download .txt** saves it; **Clear** empties it.
- The report contains the extension version, browser, task settings and the log. It does **not** contain passwords, cookies, tokens or your own account name. It does contain the profile/post addresses you targeted and your comment text if you ran a comment task.

## Page check (when something stops working)

On any TikTok tab open the floating **✦ Aurora** panel and press **Check page**. It lists what Aurora can see on that page (signed in, English interface, like button count, author, profile header, follower popup, any warning) and copies the report to your clipboard. It contains counts and ✓/✗ only: no usernames, links or tokens. Send it with the pause message when asking for help.

## Build a package

`npm run package` writes `dist/aurora-tiktok-studio-<version>.zip` with only the files Chrome needs (no tests). Unzip it and use **Load unpacked**.

## Data and source

Only `https://www.tiktok.com/*` receives host access. All settings, task state, action receipts, theme, and history stay in Chrome's local extension storage. No password/cookie extraction, analytics, license server, or remote backend. TikTok's restrictions still apply; no bypass is implemented.

Run `npm test` for planning and worker checks. Run `npm run test:browser` for browser fixtures, requiring Python Playwright and Chromium at `/usr/bin/chromium`. The tests intercept browser requests and use mock pages only.
