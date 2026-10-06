// One-off data cleanup: the "Real-Time Events Search (RapidAPI)" REST/JSON
// source mapped externalId to Google Events' ephemeral `event_id` field, so
// every 24h scheduled sync inserted a NEW row for the same real-world
// recurring event instead of upserting in place (see normalizer.service.ts
// fix in the same commit, which derives a stable content-hash external_id
// going forward). This script groups EXISTING external_events rows by
// (source_id, normalized title, venue_name, event_date, start_time), keeps
// the earliest `first_seen_at` row per group as canonical, and marks the
// rest as dedupe_status='duplicate' (soft/non-destructive — no rows are
// deleted) with duplicate_of_external_event_id pointing at the survivor.
// The existing getPublicEvents() query already excludes dedupe_status =
// 'duplicate', so this immediately removes the visible duplicates from
// "Events Around Town" without touching row content.
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const pageSize = 1000;
  let rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from('external_events')
      .select(
        'id, source_id, title, venue_name, event_date, start_time, dedupe_status, first_seen_at',
      )
      .neq('dedupe_status', 'duplicate')
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  console.log(`Fetched ${rows.length} non-duplicate rows.`);

  const groups = new Map();
  for (const row of rows) {
    const key = [
      row.source_id,
      normalizeTitle(row.title || ''),
      (row.venue_name || '').trim().toLowerCase(),
      row.event_date || '',
      row.start_time || '',
    ].join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  let flagged = 0;
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => a.first_seen_at.localeCompare(b.first_seen_at));
    const [survivor, ...dupes] = group;
    for (const dupe of dupes) {
      const { error } = await supabase
        .from('external_events')
        .update({
          dedupe_status: 'duplicate',
          duplicate_of_external_event_id: survivor.id,
        })
        .eq('id', dupe.id);
      if (error) throw error;
      flagged += 1;
    }
  }
  console.log(`Flagged ${flagged} rows as dedupe_status='duplicate'.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
