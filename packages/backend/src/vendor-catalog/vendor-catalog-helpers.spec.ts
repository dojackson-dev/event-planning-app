import { BadRequestException } from '@nestjs/common';
import {
  lineDescription,
  sanitizeCatalogItem,
  sanitizeIncludes,
  sanitizeRequestedInput,
} from './vendor-catalog-helpers';

describe('lineDescription', () => {
  it('uses the plain name for an each-priced item', () => {
    expect(
      lineDescription({ name: 'Chicken plate', kind: 'item', unit: 'each' }),
    ).toBe('Chicken plate');
  });
  it('adds the unit for hour, person and flat fee', () => {
    expect(lineDescription({ name: 'Bartender', unit: 'hour' })).toBe(
      'Bartender (per hour)',
    );
    expect(lineDescription({ name: 'Buffet', unit: 'person' })).toBe(
      'Buffet (per person)',
    );
    expect(lineDescription({ name: 'Setup', unit: 'flat' })).toBe(
      'Setup (flat fee)',
    );
  });
  it('lists what a package includes', () => {
    expect(
      lineDescription({
        name: 'Wedding package',
        kind: 'package',
        unit: 'flat',
        includes: [
          { name: 'Cake', quantity: 1 },
          { name: 'Cupcakes', quantity: 24 },
        ],
      }),
    ).toBe('Wedding package (flat fee) — includes: Cake, Cupcakes ×24');
  });
});

describe('sanitizeCatalogItem', () => {
  it('cleans a valid item', () => {
    expect(
      sanitizeCatalogItem(
        {
          name: '  Brisket ',
          section: ' Entrees ',
          unit: 'person',
          price: '18.505',
          kind: 'item',
          description: '',
        },
        'create',
      ),
    ).toEqual({
      name: 'Brisket',
      section: 'Entrees',
      unit: 'person',
      price: 18.51,
      kind: 'item',
      description: null,
    });
  });

  it('requires a name when creating, and never blanks it when updating', () => {
    expect(() => sanitizeCatalogItem({ price: 5 }, 'create')).toThrow(
      'Enter a name',
    );
    expect(() => sanitizeCatalogItem({ name: '  ' }, 'update')).toThrow(
      'Enter a name',
    );
    expect(sanitizeCatalogItem({ price: 5 }, 'update')).toEqual({ price: 5 });
  });

  it.each([
    [{ name: 'x', price: -1 }, 'price'],
    [{ name: 'x', price: 'abc' }, 'price'],
    [{ name: 'x', price: 2_000_000 }, 'price'],
    [{ name: 'x', unit: 'week' }, 'unit'],
    [{ name: 'x', kind: 'bundle' }, 'type'],
    [{ name: 'x'.repeat(121) }, 'at most 120'],
    [{ name: 'x', image_url: 'http://insecure.example/a.png' }, 'photo'],
    [{ name: 'x', hide_price: 'yes' }, 'hide_price'],
    [{ name: 'x', sort_order: 1.5 }, 'sort order'],
  ])('rejects %j', (input, message) => {
    expect(() =>
      sanitizeCatalogItem(input as Record<string, unknown>, 'create'),
    ).toThrow(message);
  });

  it('cannot change the kind of an existing item', () => {
    expect(
      sanitizeCatalogItem({ kind: 'package', name: 'x' }, 'update'),
    ).toEqual({ name: 'x' });
  });

  it('accepts clearing the photo', () => {
    expect(sanitizeCatalogItem({ image_url: '' }, 'update')).toEqual({
      image_url: null,
    });
  });
});

describe('sanitizeIncludes / sanitizeRequestedInput', () => {
  it('merges repeated items and defaults the package quantity to 1', () => {
    expect(
      sanitizeIncludes([
        { item_id: 'a' },
        { item_id: 'a', quantity: 2 },
        { item_id: 'b', quantity: 3 },
      ]),
    ).toEqual([
      { item_id: 'a', quantity: 3 },
      { item_id: 'b', quantity: 3 },
    ]);
  });
  it('rejects bad package contents', () => {
    expect(() => sanitizeIncludes('nope')).toThrow(BadRequestException);
    expect(() => sanitizeIncludes([{ item_id: 'a', quantity: 0 }])).toThrow(
      'quantity',
    );
    expect(() => sanitizeIncludes([{ quantity: 1 }])).toThrow('not valid');
  });
  it('treats no picks as an empty list', () => {
    expect(sanitizeRequestedInput(undefined)).toEqual([]);
    expect(sanitizeRequestedInput(null)).toEqual([]);
    expect(sanitizeRequestedInput([])).toEqual([]);
  });
  it.each([
    ['not an array', 'not valid'],
    [[{ item_id: 'a', quantity: 0 }], 'quantity'],
    [[{ item_id: 'a', quantity: -2 }], 'quantity'],
    [[{ item_id: 'a', quantity: 20000 }], 'quantity'],
    [[{ item_id: 'a', quantity: 'many' }], 'quantity'],
    [[{ quantity: 1 }], 'not valid'],
    [
      Array.from({ length: 51 }, (_, i) => ({ item_id: `i${i}`, quantity: 1 })),
      'at most 50',
    ],
  ])('rejects picks %#', (input, message) => {
    expect(() => sanitizeRequestedInput(input)).toThrow(message);
  });
  it('merges the same item picked twice', () => {
    expect(
      sanitizeRequestedInput([
        { item_id: 'a', quantity: 1 },
        { item_id: 'a', quantity: 2 },
      ]),
    ).toEqual([{ item_id: 'a', quantity: 3 }]);
  });
});
