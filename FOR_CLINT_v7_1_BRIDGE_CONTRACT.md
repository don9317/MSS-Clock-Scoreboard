# MSS Clock + Schedule v7.1 — Bridge Contract for Clint

The court application remains a local HTML/JavaScript application on each court PC.

The existing public MSS calendar currently calls:

`GET https://us-central1-mysportspace-d8169.cloudfunctions.net/app/facility/info-for-calendar`

with:
- `facilityId`
- `calendarDate`
- `isFacilityCalendar=false`

That existing endpoint appears to require MSS/Firebase authorization, so v7.1 does **not** embed an auth token or call it directly.

## Requested production bridge

A read-only endpoint intended for court displays, for example:

`GET /display-schedule?facilityId=...&court=COURT%203`

CORS should permit the deployment method selected for the court app. If local `file://` access is not desirable, the court app can later be served from a tiny local web server or approved MSS origin.

### Recommended JSON

```json
{
  "serverTime": "2026-08-11T18:42:00-05:00",
  "court": "COURT 3",
  "current": {
    "title": "Swarm Practice",
    "start": "2026-08-11T18:00:00-05:00",
    "end": "2026-08-11T19:30:00-05:00",
    "sport": "Basketball"
  },
  "next": {
    "title": "Court Rental",
    "start": "2026-08-11T19:30:00-05:00",
    "end": "2026-08-11T20:30:00-05:00",
    "sport": "Basketball"
  }
}
```

`current` and `next` may be `null`.

The prototype also accepts:

```json
{
  "serverTime": "...",
  "events": [
    {
      "court": "COURT 3",
      "title": "Reservation",
      "start": "...",
      "end": "...",
      "sport": "Basketball"
    }
  ]
}
```

The prototype filters `events[]` by the configured court name and determines NOW/NEXT locally.

## Refresh

Default is 60 seconds, configurable to 30/60/120 seconds.

## Server time

If `serverTime` is returned, the clock calculates the offset from the PC clock and displays MSS/server-adjusted time between refreshes.

## Security goal

The court PC should receive only schedule/display information needed for that court. Do not expose Firebase refresh tokens or general MSS credentials to the local application.
