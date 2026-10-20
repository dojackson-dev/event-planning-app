import {
  emailKey,
  findDuplicateGuest,
  phoneKey,
  sharedContact,
} from './rsvp-duplicates';

describe('rsvp-duplicates', () => {
  it('normalises phone formats to the same key', () => {
    const keys = [
      '(404) 555-0123',
      '404-555-0123',
      '+1 404 555 0123',
      '14045550123',
    ].map(phoneKey);
    expect(new Set(keys)).toEqual(new Set(['4045550123']));
    expect(phoneKey('123')).toBeNull();
    expect(phoneKey(null)).toBeNull();
  });

  it('normalises email case and whitespace', () => {
    expect(emailKey('  Jane@Example.COM ')).toBe('jane@example.com');
    expect(emailKey('not-an-email')).toBeNull();
  });

  it('matches on shared phone or email regardless of name', () => {
    const existing = [
      { id: '1', guest_name: 'Jane Smith', guest_phone: '404-555-0123' },
      { id: '2', guest_name: 'Bob', guest_email: 'bob@x.com' },
    ];
    expect(
      findDuplicateGuest(
        { guest_name: 'Janie', guest_phone: '(404) 555 0123' },
        existing,
      ),
    ).toMatchObject({ reason: 'phone', match: { id: '1' } });
    expect(
      findDuplicateGuest(
        { guest_name: 'Robert', guest_email: 'BOB@x.com' },
        existing,
      ),
    ).toMatchObject({ reason: 'email', match: { id: '2' } });
  });

  it('treats same-name guests with different contacts as different people', () => {
    const existing = [
      { id: '1', guest_name: 'John Smith', guest_phone: '404-555-0123' },
    ];
    expect(
      findDuplicateGuest(
        { guest_name: 'john  smith', guest_phone: '404-555-9999' },
        existing,
      ),
    ).toBeNull();
  });

  it('flags same-name guests when one side has no contact details', () => {
    const existing = [
      { id: '1', guest_name: 'John Smith', guest_phone: '404-555-0123' },
    ];
    expect(
      findDuplicateGuest({ guest_name: 'John Smith' }, existing),
    ).toMatchObject({
      reason: 'name',
    });
    expect(
      findDuplicateGuest(
        { guest_name: 'John Smith', guest_phone: '404-555-9999' },
        [{ id: '2', guest_name: 'john smith' }],
      ),
    ).toMatchObject({ reason: 'name' });
  });

  it('does not flag unrelated guests', () => {
    expect(
      findDuplicateGuest({ guest_name: 'Amy', guest_phone: '404-555-1111' }, [
        { id: '1', guest_name: 'Ben', guest_phone: '404-555-2222' },
      ]),
    ).toBeNull();
  });

  it('sharedContact ignores names', () => {
    expect(
      sharedContact(
        { guest_name: 'A', guest_email: 'a@x.com' },
        { guest_name: 'B', guest_email: 'A@X.com' },
      ),
    ).toBe('email');
    expect(sharedContact({ guest_name: 'A' }, { guest_name: 'A' })).toBeNull();
  });
});
