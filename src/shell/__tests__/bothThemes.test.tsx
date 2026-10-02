import React from 'react';
import { render } from '@testing-library/react-native';
import { useFacilityStore } from '../../core/store';
import { DARK, LIGHT, type Palette } from '../../core/theme';
import { Cabinet } from '../Cabinet';
import { FileScreen } from '../FileScreen';
import { KeyGate } from '../KeyGate';
import { KeyPanel } from '../KeyPanel';
import { LogScreen } from '../LogScreen';
import { Splash } from '../Splash';
import { SystemScreen } from '../SystemScreen';

// Nothing in this file is allowed to leave the process, and the OS keystore has
// no jsdom implementation.
jest.mock('../../vera/llm', () => ({
  ...jest.requireActual('../../vera/llm'),
  callLlm: jest.fn(async () => '{"emotion":"calm","line":"Noted."}'),
}));
jest.mock('expo-secure-store', () => {
  const vault = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => vault.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => {
      vault.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k: string) => {
      vault.delete(k);
    }),
  };
});

const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean) as object[]);

beforeEach(() => {
  useFacilityStore.setState({
    theme: 'dark',
    lang: 'en',
    apiKey: 'sk-ant-api03-abcdefghijklmnop',
    cabinetOpen: true,
    view: 'mem',
    log: [],
    emotion: 'calm',
    systemNotice: null,
  });
});

// Each row names a screen, the testID of the surface carrying its ground, and
// which token that ground should be. One row per themed screen; a screen added
// to the shell without a row here is a screen nothing checks.
const SURFACES: [string, React.ComponentType, string, (p: Palette) => string][] = [
  ['LogScreen', LogScreen, 'log-screen', (p) => p.bgDeep],
  ['SystemScreen', SystemScreen, 'system-screen', (p) => p.bgDeep],
  ['FileScreen', FileScreen, 'file-screen', (p) => p.bgFile],
  ['KeyGate', KeyGate, 'key-gate', (p) => p.panelAlt],
  ['Cabinet', Cabinet, 'cabinet-sheet', (p) => p.sheet],
  // The ACCESS panel dims harder than the cabinet: it is a modal over the
  // stage rather than a sheet in front of it.
  ['KeyPanel', KeyPanel, 'access-backdrop', (p) => p.scrimStrong],
];

describe.each(SURFACES)('%s', (_name, Screen, testID, ground) => {
  it('takes its ground from the theme', async () => {
    const dark = await render(<Screen />);
    expect(flat(dark.getByTestId(testID).props.style).backgroundColor).toBe(ground(DARK));
    await dark.unmount();

    useFacilityStore.setState({ theme: 'light' });
    const light = await render(<Screen />);
    expect(flat(light.getByTestId(testID).props.style).backgroundColor).toBe(ground(LIGHT));
    await light.unmount();
  });
});

// Four tokens that only moved into the palette because the theme needed them,
// and that nothing else in the suite reads. The erase chip is the sharper of
// the two: it is the app's own voice, and dark's #ff4a3d is 2.87:1 on a pale
// ground.
describe('the tokens the theme forced out of hiding', () => {
  it('themes the subject\u2019s own bubble and the destructive chip', async () => {
    useFacilityStore.setState({
      log: [
        { who: 'you', text: 'something', t: Date.now() },
        { who: 'vera', text: 'Noted.', t: Date.now() },
      ],
      // The chip stands only mid-confirmation, which is the one state on this
      // screen where KEEP and ERASE are the only things worth reading.
      confirmingClear: true,
    });

    const dark = await render(<LogScreen />);
    expect(flat(dark.getByTestId('you-bubble').props.style).backgroundColor).toBe(DARK.youBg);
    expect(flat(dark.getByTestId('erase-chip').props.style)).toMatchObject({
      borderColor: DARK.dangerEdge,
      backgroundColor: DARK.dangerWash,
    });
    await dark.unmount();

    useFacilityStore.setState({ theme: 'light' });
    const light = await render(<LogScreen />);
    expect(flat(light.getByTestId('you-bubble').props.style).backgroundColor).toBe(LIGHT.youBg);
    expect(flat(light.getByTestId('erase-chip').props.style)).toMatchObject({
      borderColor: LIGHT.dangerEdge,
      backgroundColor: LIGHT.dangerWash,
    });
    await light.unmount();
  });
});

// The one screen that must NOT follow it. Its ground is `iconBg`, which
// `app.json` fixes at build time and which therefore cannot know what theme is
// stored — so its type cannot change either, or the light palette's graphite
// would sit on a near-black splash. A light-theme launch shows this dark and
// then crosses to a pale app, which is the seam no code here can close.
describe('Splash', () => {
  it('stays dark whatever the theme says', async () => {
    const dark = await render(<Splash hasKey />);
    const darkGround = flat(dark.getByTestId('splash').props.style).backgroundColor;
    await dark.unmount();

    useFacilityStore.setState({ theme: 'light' });
    const light = await render(<Splash hasKey />);
    expect(flat(light.getByTestId('splash').props.style).backgroundColor).toBe(darkGround);
    expect(darkGround).toBe(DARK.iconBg);
    await light.unmount();
  });
});
