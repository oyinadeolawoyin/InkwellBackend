// src/utils/timezone.js
//
// Shared timezone helpers. Pulled out of draftPlanService.js so that
// daysChallengeService.js (and anything else with a "remind me at HH:MM
// in my local time" field) can use the exact same conversion logic instead
// of drifting into a second, slightly-different implementation.

// Normalise any date to midnight UTC for consistent day keying
function toMidnightUTC(date) {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
  
  // Get "today" as a UTC-midnight Date, anchored to the user's local calendar
  // day rather than the server's UTC day. Without this, a user in e.g. UTC+11
  // logging at 11pm local time gets keyed to the wrong day, because the
  // server's UTC clock has already rolled to tomorrow (or hasn't rolled to
  // today yet) relative to them.
  function todayInTimezone(timezone, referenceDate = new Date()) {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(referenceDate);
      const y = parts.find((p) => p.type === "year").value;
      const m = parts.find((p) => p.type === "month").value;
      const d = parts.find((p) => p.type === "day").value;
      return new Date(`${y}-${m}-${d}T00:00:00.000Z`);
    } catch {
      // Unknown/invalid timezone — fall back to server UTC day rather than throwing
      return toMidnightUTC(referenceDate);
    }
  }
  
  // Convert a local "HH:MM" + IANA timezone string → "HH:MM" in UTC.
  // Uses the current UTC offset for the timezone (handles DST correctly,
  // since the offset is read live rather than baked into a fixed reference
  // date the way a naive implementation would do it).
  function localTimeToUTC(timeStr, timezone) {
    try {
      const now       = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone:     timezone,
        hour:         "numeric",
        minute:       "numeric",
        hour12:       false,
        timeZoneName: "shortOffset",
      });
      const parts     = formatter.formatToParts(now);
      const offsetStr = parts.find((p) => p.type === "timeZoneName")?.value ?? "UTC+0";
      // Parse "+05:30" or "-04:00" or "UTC"
      const match     = offsetStr.match(/([+-])(\d{1,2}):?(\d{2})?/);
      let offsetMins  = 0;
      if (match) {
        const sign    = match[1] === "+" ? 1 : -1;
        offsetMins    = sign * (Number(match[2]) * 60 + Number(match[3] ?? 0));
      }
      const [hh, mm]  = timeStr.split(":").map(Number);
      let utcMins     = hh * 60 + mm - offsetMins;
      // Wrap around midnight
      utcMins         = ((utcMins % 1440) + 1440) % 1440;
      const utcHH     = String(Math.floor(utcMins / 60)).padStart(2, "0");
      const utcMM     = String(utcMins % 60).padStart(2, "0");
      return `${utcHH}:${utcMM}`;
    } catch {
      // Fallback: treat as already-UTC rather than throwing
      return timeStr;
    }
  }
  
  // Get the start of the current week (Sunday, midnight) in the given timezone.
  function startOfWeekInTimezone(timezone) {
    const d = todayInTimezone(timezone);
    d.setUTCDate(d.getUTCDate() - d.getUTCDay());
    return d;
  }
  
  module.exports = {
    toMidnightUTC,
    todayInTimezone,
    localTimeToUTC,
    startOfWeekInTimezone,
  };