import { extractScanCode } from './scan-code';

const ID = '3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f';

describe('extractScanCode', () => {
  it('leaves a bare ticket id alone', () => {
    expect(extractScanCode(ID)).toBe(ID);
  });

  it('trims whitespace a scanner may add', () => {
    expect(extractScanCode(`  ${ID}\n`)).toBe(ID);
  });

  it('reads the id out of the link in an emailed ticket QR', () => {
    expect(extractScanCode(`https://www.eventecos.com/ticket/${ID}`)).toBe(ID);
    expect(extractScanCode(`https://www.eventecos.com/ticket/${ID}/`)).toBe(ID);
    expect(extractScanCode(`http://localhost:3000/ticket/${ID}?x=1#top`)).toBe(
      ID,
    );
  });

  it('keeps VIP codes that are not links', () => {
    expect(extractScanCode('VIP-ABC123')).toBe('VIP-ABC123');
  });

  it('returns an empty string for anything that is not text', () => {
    expect(extractScanCode(undefined)).toBe('');
    expect(extractScanCode(42)).toBe('');
  });
});
