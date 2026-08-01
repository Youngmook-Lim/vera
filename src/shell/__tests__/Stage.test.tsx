// src/shell/__tests__/Stage.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { useFacilityStore } from '../../core/store';
import { ms } from '../../core/theme';
import { Stage } from '../Stage';

const awake = (over = {}) =>
  useFacilityStore.setState({
    apiKey: 'sk-ant-api03-abcdefghijklmnop', emotion: 'calm', lang: 'en',
    line: '', shown: '', thinking: false, log: [], cabinetOpen: false, ...over,
  });

describe('Stage', () => {
  it('shows her emotion label in the reading language', async () => {
    awake({ emotion: 'suspicious' });
    const view = await render(<Stage />);
    expect(view.getByText('SUSPICIOUS')).toBeTruthy();

    awake({ emotion: 'suspicious', lang: 'ko' });
    const ko = await render(<Stage />);
    expect(ko.getByText('의심스러워요')).toBeTruthy();
  });

  it('sizes a short line loud and a long line small', async () => {
    awake({ shown: 'You returned.' });
    const short = await render(<Stage />);
    expect(short.getByTestId('her-line').props.style).toEqual(
      expect.objectContaining({ fontSize: ms(30) }),
    );

    const long = Array.from({ length: 34 }, () => 'word').join(' ');
    awake({ shown: long });
    const wordy = await render(<Stage />);
    expect(wordy.getByTestId('her-line').props.style).toEqual(
      expect.objectContaining({ fontSize: ms(15) }),
    );
  });

  it('hides the conversation pill until there is a transcript', async () => {
    awake({ log: [] });
    const empty = await render(<Stage />);
    expect(empty.queryByText('OPEN CONVERSATION')).toBeNull();

    awake({ log: [{ who: 'vera', text: 'Hm.', t: 1, emotion: 'calm' }] });
    const withLog = await render(<Stage />);
    expect(withLog.getByText('OPEN CONVERSATION')).toBeTruthy();
  });

  it('gives a dormant stage no input and no drawer', async () => {
    useFacilityStore.setState({ apiKey: '', emotion: 'dormant', log: [] });
    const view = await render(<Stage />);
    expect(view.queryByPlaceholderText('say something to her')).toBeNull();
    expect(view.queryByText('CABINET')).toBeNull();
  });
});
