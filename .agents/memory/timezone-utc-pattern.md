---
name: Timezone UTC+3 pattern
description: Server is UTC, user is in Egypt (UTC+3). Backend date comparisons need a +1 calendar day buffer.
---

The API server runs in UTC. The user is in Egypt (UTC+3). This means that between 00:00–02:59 AM local time, the server still thinks it is the previous calendar day.

**The rule:** Any backend date check that compares a client-supplied date against "today" must allow a +1 day buffer.

**Pattern to use:**
```ts
const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0)
const tomorrowDate = new Date(todayDate.getTime() + 24 * 60 * 60 * 1000)
const isClientToday =
  targetDay.getTime() === todayDate.getTime() ||
  targetDay.getTime() === tomorrowDate.getTime()
```

**Why:** Without the buffer, any operation between midnight and 3 AM local time fails with "not today's treasury" or similar, because the server's UTC day hasn't advanced yet.

**Where applied so far:**
- `get-by-date` handler: `isToday` check uses `targetDate < serverToday + 2*DAY_MS`
- `sealPastOpenTreasuries`: uses `max(targetDate, serverToday)` as the cutoff
- `reopen-day` handler: checks `treasuryDay === todayDate OR tomorrowDate`

**Frontend:** `toDateStr` in `date-context.tsx` uses local year/month/day (not UTC) so the client always sends the correct local date string.
