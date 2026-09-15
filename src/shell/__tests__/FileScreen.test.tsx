import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useFacilityStore } from '../../core/store';
import { EMPTY_MEMORY } from '../../vera/memory';
import { FileScreen } from '../FileScreen';

describe('FileScreen', () => {
  it('renders SOUL.md as the document itself', async () => {
    useFacilityStore.setState({ view: 'soul', lang: 'en' });
    const view = await render(<FileScreen />);
    expect(view.getByTestId('file-body').props.children).toContain('# SOUL.md');
    await view.unmount();
  });

  // The two documents are shown apart because they ARE apart: the core is what
  // every mode is written against, and the mode is the half that was chosen.
  it('shows the core document alone under SOUL.md', async () => {
    useFacilityStore.setState({ view: 'soul', lang: 'en', mode: 'supportive' });
    const view = await render(<FileScreen />);
    const body = view.getByTestId('file-body').props.children as string;
    expect(body).toContain('Very Emotional Robot Assistant');
    expect(body).not.toContain('Warm. Certain. Unhurried.');
    await view.unmount();
  });

  it('shows the active register’s document under its own row', async () => {
    useFacilityStore.setState({ view: 'mode', lang: 'en', mode: 'supportive' });
    const view = await render(<FileScreen />);
    const body = view.getByTestId('file-body').props.children as string;
    expect(body).toContain('Warm. Certain. Unhurried.');
    expect(body).not.toContain('Very Emotional Robot Assistant');
    await view.unmount();
  });

  // Named as a sibling of SOUL.md, because that is what it is: the same
  // document's chosen half. Not translated, for the same reason SOUL.md is not.
  it('names that document as a sibling of SOUL.md', async () => {
    useFacilityStore.setState({ view: 'mode', lang: 'en', mode: 'default' });
    const view = await render(<FileScreen />);
    expect(view.getByText('SOUL.DEFAULT.md')).toBeTruthy();
    await view.unmount();

    useFacilityStore.setState({ view: 'mode', lang: 'ko', mode: 'supportive' });
    const ko = await render(<FileScreen />);
    expect(ko.getByText('SOUL.SUPPORTIVE.md')).toBeTruthy();
    await ko.unmount();
  });
});

const MEMORY = {
  facts: [
    { id: 'f_1', text: 'works in software', keys: ['work'], at: 1, durable: true, until: null },
    { id: 'f_2', text: 'deadline passed', keys: [], at: 1, durable: false, until: 2 },
  ],
  verdicts: [{ id: 'v_1', text: 'Deflects.', firstAt: 1, at: 1, count: 3, wasAt: 'JUL 30' }],
  threads: [
    { id: 't_1', text: 'Asked what he avoids.', at: 1, resolved: false, askedBy: 'you' as const },
    { id: 't_2', text: 'Asked about sleep.', at: 1, resolved: true, askedBy: 'they' as const },
  ],
  pending: [],
};

describe('RECORD', () => {
  it('shows everything she knows, in all three kinds', async () => {
    useFacilityStore.setState({ view: 'mem', lang: 'en', cleared: 0, memory: MEMORY });
    const view = await render(<FileScreen />);
    const body = view.getByTestId('file-body').props.children as string;
    expect(body).toContain('works in software');
    expect(body).toContain('Deflects.');
    expect(body).toContain('Asked what he avoids.');
    await view.unmount();
  });

  it('marks what is expired and what is resolved, without hiding either', async () => {
    useFacilityStore.setState({ view: 'mem', lang: 'en', cleared: 0, memory: MEMORY });
    const view = await render(<FileScreen />);
    const body = view.getByTestId('file-body').props.children as string;
    expect(body).toContain('deadline passed');
    expect(body).toMatch(/EXPIRED.*deadline passed|deadline passed.*EXPIRED/s);
    expect(body).toContain('Asked about sleep.');
    expect(body).toMatch(/RESOLVED.*Asked about sleep|Asked about sleep.*RESOLVED/s);
    await view.unmount();
  });

  it('reports an empty file plainly', async () => {
    useFacilityStore.setState({
      view: 'mem', lang: 'en', cleared: 0,
      memory: { facts: [], verdicts: [], threads: [], pending: [] },
    });
    const view = await render(<FileScreen />);
    expect(view.getByTestId('file-body').props.children).toContain('(empty)');
    await view.unmount();
  });
});

// The record's own erase. SOUL.md is read-only and the PROMPT screen is a
// debugging surface — only the subject's file offers this.
describe('erasing the record', () => {
  const openRecord = () => useFacilityStore.setState({
    view: 'mem', lang: 'en', cleared: 0, memory: MEMORY, confirmingWipe: false,
  });

  it('offers CLEAR on the record and nowhere else', async () => {
    openRecord();
    const record = await render(<FileScreen />);
    expect(record.getByTestId('record-clear')).toBeTruthy();
    await record.unmount();

    useFacilityStore.setState({ view: 'soul' });
    const soul = await render(<FileScreen />);
    expect(soul.queryByTestId('record-clear')).toBeNull();
    await soul.unmount();
  });

  // The same two-step the transcript uses: nothing this final happens on one
  // press.
  it('asks before it erases, and keeps the record when told to', async () => {
    openRecord();
    const view = await render(<FileScreen />);
    await fireEvent.press(view.getByTestId('record-clear'));
    expect(view.getByTestId('record-erase')).toBeTruthy();

    await fireEvent.press(view.getByTestId('record-keep'));
    expect(view.queryByTestId('record-erase')).toBeNull();
    expect(useFacilityStore.getState().memory.facts).toHaveLength(2);
    await view.unmount();
  });

  it('erases on the second press', async () => {
    openRecord();
    const view = await render(<FileScreen />);
    await fireEvent.press(view.getByTestId('record-clear'));
    await fireEvent.press(view.getByTestId('record-erase'));
    expect(useFacilityStore.getState().memory).toEqual(EMPTY_MEMORY);
    await view.unmount();
  });

  // A confirmation found still open on a later visit would be one press from
  // destroying the file.
  it('does not leave the confirmation standing behind it', async () => {
    openRecord();
    const first = await render(<FileScreen />);
    await fireEvent.press(first.getByTestId('record-clear'));
    await first.unmount();

    useFacilityStore.setState({ memory: MEMORY });
    const second = await render(<FileScreen />);
    expect(second.queryByTestId('record-erase')).toBeNull();
    await second.unmount();
  });
});

