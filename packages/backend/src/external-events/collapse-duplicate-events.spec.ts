import { collapseDuplicateEvents } from './external-events.service';

const base = {
  title: 'Edmonton Oilers at New York Rangers',
  event_date: '2026-11-01',
  start_time: '18:00:00',
  venue_name: 'Madison Square Garden',
  city: 'New York',
  image_url: null,
  event_url: null,
  description: null,
};

describe('collapseDuplicateEvents', () => {
  it('keeps one row for the same show arriving from several city feeds', () => {
    const rows = ['a', 'b', 'c'].map((id) => ({ ...base, id }));
    expect(collapseDuplicateEvents(rows).map((r) => r.id)).toEqual(['a']);
  });

  it('ignores punctuation and case in title and venue', () => {
    const rows = [
      { ...base, id: 'a' },
      {
        ...base,
        id: 'b',
        title: 'edmonton oilers at new york rangers!',
        venue_name: 'MADISON SQUARE GARDEN',
      },
    ];
    expect(collapseDuplicateEvents(rows)).toHaveLength(1);
  });

  it('prefers the copy with the most details, in the original position', () => {
    const rows = [
      { ...base, id: 'plain' },
      { ...base, id: 'other', title: 'Another Show' },
      { ...base, id: 'rich', image_url: 'x.jpg', event_url: 'https://x' },
    ];
    expect(collapseDuplicateEvents(rows).map((r) => r.id)).toEqual([
      'rich',
      'other',
    ]);
  });

  it('keeps different dates, times and venues apart', () => {
    const rows = [
      { ...base, id: 'a' },
      { ...base, id: 'b', event_date: '2026-11-02' },
      { ...base, id: 'c', start_time: '20:00:00' },
      { ...base, id: 'd', venue_name: 'Barclays Center' },
    ];
    expect(collapseDuplicateEvents(rows)).toHaveLength(4);
  });
});
