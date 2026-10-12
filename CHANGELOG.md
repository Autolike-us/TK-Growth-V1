# Changelog

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
