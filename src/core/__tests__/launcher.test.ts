// src/core/__tests__/launcher.test.ts
import AppIcon from '../../../modules/app-icon/src/AppIconModule';
import { faceFor } from '../appIcon';
import { launcherResult, readLauncherFace, syncLaunchTheme, syncLauncherIcon } from '../launcher';

// The native module is stubbed in jest.setup.ts; these tests drive that stub to
// stand in for a launcher that takes the swap, one that refuses it, and one
// that cannot be read at all.
const icon = AppIcon as unknown as {
  getIcon: () => string;
  setIcon: (face: string) => boolean;
  setNightMode?: (dark: boolean) => boolean;
};

const NOW = Date.UTC(2026, 8, 1);
const TODAY = faceFor(NOW, true);

const original = { getIcon: icon.getIcon, setIcon: icon.setIcon, setNightMode: icon.setNightMode };
afterEach(() => {
  icon.getIcon = original.getIcon;
  icon.setIcon = original.setIcon;
  icon.setNightMode = original.setNightMode;
});

// A launcher that takes the swap and one that quietly does not used to be the
// same thing here: every failure was swallowed and nothing was recorded, which
// is why the rotation could sit stuck for weeks with nothing to read.
describe('syncLauncherIcon', () => {
  it('reports nothing when the launcher took the face it was asked for', () => {
    let worn = 'Dormant';
    icon.setIcon = (face) => { worn = face; return true; };
    icon.getIcon = () => worn;

    syncLauncherIcon(true, 'dark', NOW);
    expect(worn).toBe(TODAY);
    expect(launcherResult()).toBeNull();
  });

  // `setIcon` returns false both for "already showing" and for "no such face",
  // so the answer has to come from reading the state back rather than from what
  // it returned.
  it('names both faces when the launcher did not move', () => {
    icon.setIcon = () => false;
    icon.getIcon = () => 'Bored';

    syncLauncherIcon(true, 'dark', NOW);
    expect(launcherResult()).toBe(`asked for ${TODAY}, launcher reports Bored`);
  });

  it('says so when the launcher reports no face at all', () => {
    icon.setIcon = () => false;
    icon.getIcon = () => '';

    syncLauncherIcon(true, 'dark', NOW);
    expect(launcherResult()).toBe(`asked for ${TODAY}, launcher reports nothing`);
  });

  // Still caught: a launcher that refuses the swap, or a module that failed to
  // link, must never be the reason the app goes down on the way to background.
  it('keeps the throw off the background transition, and keeps its wording', () => {
    icon.setIcon = () => { throw new Error('component not found'); };

    expect(() => syncLauncherIcon(true, 'dark', NOW)).not.toThrow();
    expect(launcherResult()).toBe('component not found');
  });

  it('clears a stale complaint once the swap works again', () => {
    icon.setIcon = () => { throw new Error('component not found'); };
    syncLauncherIcon(true, 'dark', NOW);
    expect(launcherResult()).not.toBeNull();

    let worn = 'Dormant';
    icon.setIcon = (face) => { worn = face; return true; };
    icon.getIcon = () => worn;
    syncLauncherIcon(true, 'dark', NOW);
    expect(launcherResult()).toBeNull();
  });

  it('asks for dormant when there is no key, whatever day it is', () => {
    let worn = '';
    icon.setIcon = (face) => { worn = face; return true; };
    icon.getIcon = () => worn;

    syncLauncherIcon(false, 'dark', NOW);
    expect(worn).toBe('Dormant');
  });
});

describe('readLauncherFace', () => {
  it('reports the face the launcher is actually wearing', () => {
    icon.getIcon = () => 'Alarmed';
    expect(readLauncherFace()).toBe('Alarmed');
  });

  // Unreadable and "wearing nothing" are the same answer to the caller, and
  // both are worth showing rather than being smoothed into a plausible face.
  it('is null when the state cannot be read', () => {
    icon.getIcon = () => { throw new Error('no package manager'); };
    expect(readLauncherFace()).toBeNull();
  });

  it('is null rather than an empty string when no alias is enabled', () => {
    icon.getIcon = () => '';
    expect(readLauncherFace()).toBeNull();
  });
});

// The same day, the other drawing (2026-10-08).
describe('syncLauncherIcon on the light ground', () => {
  it("asks for the light drawing of today's face", () => {
    let worn = 'Dormant';
    icon.setIcon = (face) => { worn = face; return true; };
    icon.getIcon = () => worn;

    syncLauncherIcon(true, 'light', NOW);
    expect(worn).toBe(`Light_${TODAY}`);
    expect(launcherResult()).toBeNull();
  });

  it('asks for the light dormant face with no key', () => {
    let worn = 'Dormant';
    icon.setIcon = (face) => { worn = face; return true; };
    icon.getIcon = () => worn;

    syncLauncherIcon(false, 'light', NOW);
    expect(worn).toBe('Light_Dormant');
  });
});

// The first frame of the next launch is drawn by Android from the app's own
// night mode, so the theme has to be handed to the system ahead of time.
describe('syncLaunchTheme', () => {
  it('tells Android the dark ground is night and the light one is day', () => {
    const asked: boolean[] = [];
    icon.setNightMode = (dark) => { asked.push(dark); return true; };

    syncLaunchTheme('dark');
    syncLaunchTheme('light');
    expect(asked).toEqual([true, false]);
  });

  // A dev build made before the function existed has the module and not the
  // method. Calling undefined on the way to the background must not throw.
  it('does nothing on a build that predates it', () => {
    icon.setNightMode = undefined;
    expect(() => syncLaunchTheme('light')).not.toThrow();
  });

  it('swallows a refusal, as the icon does', () => {
    icon.setNightMode = () => { throw new Error('no'); };
    expect(() => syncLaunchTheme('light')).not.toThrow();
  });
});
