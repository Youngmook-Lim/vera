import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useFacilityStore } from '../../core/store';
import { Stage } from '../Stage';
import { VoiceRow } from '../VoiceRow';
import { VoiceToggle } from '../VoiceToggle';

jest.mock('../../vera/llm', () => ({ ...jest.requireActual('../../vera/llm'), callLlm: jest.fn() }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));
jest.mock('../../core/voice', () => ({
  VOICE_TIMEOUT_MS: 8000, prepareVoice: jest.fn(), playVoice: jest.fn(), stopVoice: jest.fn(),
}));
const { stopVoice } = jest.requireMock('../../core/voice');

const OPENROUTER = 'sk-or-v1-0123456789abcdef0123456789abcdef';
const ANTHROPIC = 'sk-ant-api03-abcdefghijklmnop';

beforeEach(() => {
  jest.clearAllMocks();
  useFacilityStore.setState({ apiKey: OPENROUTER, emotion: 'calm', lang: 'en', theme: 'dark', voice: false, line: '', shown: '', log: [] });
});

describe('the VOICE row', () => {
  it('reads OFF, and switches her on', async () => {
    const view = await render(<VoiceRow />);
    expect(view.getByTestId('pref-voice').props.children).toBe('OFF');
    await fireEvent.press(view.getByText('VOICE'));
    expect(useFacilityStore.getState().voice).toBe(true);
    expect(view.getByTestId('pref-voice').props.children).toBe('ON');
    await view.unmount();
  });

  it('says so on a key that cannot speak, and offers no switch', async () => {
    useFacilityStore.setState({ apiKey: ANTHROPIC });
    const view = await render(<VoiceRow />);
    expect(view.getByTestId('pref-voice').props.children).toBe('NOT ON THIS KEY');
    await fireEvent.press(view.getByText('VOICE'));
    expect(useFacilityStore.getState().voice).toBe(false);
    await view.unmount();
  });

  it('reads in Korean', async () => {
    useFacilityStore.setState({ lang: 'ko' });
    const view = await render(<VoiceRow />);
    expect(view.getByText('목소리')).toBeTruthy();
    await view.unmount();
  });
});

describe('the stage glyph', () => {
  it('switches her on and off, and says which', async () => {
    const view = await render(<VoiceToggle />);
    const glyph = view.getByTestId('voice-toggle');
    expect(glyph.props.accessibilityState).toEqual({ checked: false });
    await fireEvent.press(glyph);
    expect(useFacilityStore.getState().voice).toBe(true);
    await fireEvent.press(view.getByTestId('voice-toggle'));
    expect(useFacilityStore.getState().voice).toBe(false);
    expect(stopVoice).toHaveBeenCalled();
    await view.unmount();
  });

  it('is not offered on a key that cannot speak', async () => {
    useFacilityStore.setState({ apiKey: ANTHROPIC });
    const view = await render(<VoiceToggle />);
    expect(view.queryByTestId('voice-toggle')).toBeNull();
    await view.unmount();
  });

  it('sits in the stage header while she is awake', async () => {
    const view = await render(<Stage />);
    expect(view.getByTestId('voice-toggle')).toBeTruthy();
    await view.unmount();
  });
});
