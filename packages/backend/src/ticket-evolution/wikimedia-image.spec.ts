import {
  CARD_IMAGE_WIDTH,
  pickWikipediaImage,
  sizeWikimediaImage,
} from './wikimedia-image';

const base = 'https://upload.wikimedia.org/wikipedia/commons';

describe('sizeWikimediaImage', () => {
  it('shrinks an oversized thumbnail to the card width and drops tracking parameters', () => {
    const big = `https://thumb.wikimedia.org/wikipedia/commons/thumb/0/02/Switchfoot_The_National.jpg/3840px-Switchfoot_The_National.jpg?utm_source=en.wikipedia.org&utm_campaign=api`;
    expect(sizeWikimediaImage(big, 5000)).toBe(
      `https://thumb.wikimedia.org/wikipedia/commons/thumb/0/02/Switchfoot_The_National.jpg/${CARD_IMAGE_WIDTH}px-Switchfoot_The_National.jpg`,
    );
  });

  it('leaves a thumbnail that is already small enough alone', () => {
    const small = `${base}/thumb/a/a5/Venue.jpg/330px-Venue.jpg`;
    expect(sizeWikimediaImage(small, 4000)).toBe(small);
  });

  it('turns a large original into a thumbnail URL', () => {
    expect(
      sizeWikimediaImage(`${base}/f/f2/Hayes_Carll.jpg?utm_source=x`, 4200),
    ).toBe(
      `${base}/thumb/f/f2/Hayes_Carll.jpg/${CARD_IMAGE_WIDTH}px-Hayes_Carll.jpg`,
    );
    expect(sizeWikimediaImage(`${base}/a/a5/Poster.PNG`, 2000)).toBe(
      `${base}/thumb/a/a5/Poster.PNG/${CARD_IMAGE_WIDTH}px-Poster.PNG`,
    );
  });

  it('keeps encoded file names intact', () => {
    const name = 'Hayes_Carll_on_stage_at_Chief%E2%80%99s_on_Broadway.jpg';
    expect(sizeWikimediaImage(`${base}/f/f2/${name}`, 3000)).toBe(
      `${base}/thumb/f/f2/${name}/${CARD_IMAGE_WIDTH}px-${name}`,
    );
  });

  it('does not touch originals that are already small or whose width is unknown', () => {
    const small = `${base}/a/a5/Small.jpg`;
    expect(sizeWikimediaImage(small, 800)).toBe(small);
    expect(sizeWikimediaImage(small, undefined)).toBe(small);
  });

  it('does not resize formats Wikimedia cannot thumbnail, or images from other sites', () => {
    const svg = `${base}/a/a5/Logo.svg`;
    expect(sizeWikimediaImage(svg, 5000)).toBe(svg);
    expect(sizeWikimediaImage('https://img.example.test/a.jpg', 5000)).toBe(
      'https://img.example.test/a.jpg',
    );
    expect(sizeWikimediaImage('not a url', 5000)).toBe('not a url');
  });
});

describe('pickWikipediaImage', () => {
  it('prefers the original, sized for cards', () => {
    expect(
      pickWikipediaImage({
        thumbnail: {
          source: `${base}/thumb/a/a5/P.jpg/320px-P.jpg`,
          width: 320,
        },
        originalimage: { source: `${base}/a/a5/P.jpg`, width: 3000 },
      }),
    ).toBe(`${base}/thumb/a/a5/P.jpg/${CARD_IMAGE_WIDTH}px-P.jpg`);
  });

  it('falls back to the thumbnail, then to nothing', () => {
    expect(
      pickWikipediaImage({ thumbnail: { source: 'https://img/t.jpg' } }),
    ).toBe('https://img/t.jpg');
    expect(pickWikipediaImage({})).toBeNull();
  });
});
