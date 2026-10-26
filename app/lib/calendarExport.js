/**
 * Utilities for sharing calendar events with zero-auth requirements:
 * 1. Google Calendar Web Intent template link
 * 2. .ics data URI for native Apple / Outlook / Android calendar import
 */

export function getGoogleCalendarTemplateUrl({
  title,
  description = '',
  location = '',
  startsAt = null,
  endsAt = null,
}) {
  const startDate = startsAt ? new Date(startsAt) : new Date();
  const endDate = endsAt
    ? new Date(endsAt)
    : new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour default

  const fmt = (d) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'Church Fellowship Event',
    dates: `${fmt(startDate)}/${fmt(endDate)}`,
    details: description || 'Shammah Church Event',
    location: location || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function generateIcsDataUri({
  title,
  description = '',
  location = '',
  startsAt = null,
  endsAt = null,
}) {
  const startDate = startsAt ? new Date(startsAt) : new Date();
  const endDate = endsAt
    ? new Date(endsAt)
    : new Date(startDate.getTime() + 60 * 60 * 1000);

  const fmt = (d) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Shammah Faith Community//Event Sync//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${Date.now()}-${Math.random().toString(36).slice(2, 9)}@shammah.org`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(startDate)}`,
    `DTEND:${fmt(endDate)}`,
    `SUMMARY:${(title || 'Church Event').replace(/[,\n]/g, ' ')}`,
    `DESCRIPTION:${(description || '').replace(/\n/g, '\\n')}`,
    `LOCATION:${(location || '').replace(/[,\n]/g, ' ')}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(icsLines.join('\r\n'))}`;
}
