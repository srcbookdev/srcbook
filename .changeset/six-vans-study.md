---
'@srcbook/api': patch
---

fix(api): Handle session cleanup after srcbook deletion. Resolved an issue where deleting an srcbook would lead to an uncaught exception due to an orphaned session. The fix ensures proper cleanup of associated sessions when an srcbook is deleted, preventing the "Session with id not found" error.
