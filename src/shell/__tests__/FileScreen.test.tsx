import React from 'react';
import { render } from '@testing-library/react-native';
import { useFacilityStore } from '../../core/store';
import { FileScreen } from '../FileScreen';

describe('FileScreen', () => {
  it('renders SOUL.md as the document itself', async () => {
    useFacilityStore.setState({ view: 'soul', lang: 'en' });
    const view = await render(<FileScreen />);
    expect(view.getByTestId('file-body').props.children).toContain('# SOUL.md');
    await view.unmount();
  });
});

const MEMORY = {
  facts: [
    { id: 'f_1', text: 'works in software', keys: ['work'], at: 1, durable: true, until: null },
    { id: 'f_2', text: 'deadline passed', keys: [], at: 1, durable: false, until: 2 },
  ],
  verdicts: [{ id: 'v_1', text: 'Deflects.', firstAt: 1, at: 1, count: 3, wasAt: 'JUL 30' }],
  threads: [
    { id: 't_1', text: 'Asked what he avoids.', at: 1, resolved: false },
    { id: 't_2', text: 'Asked about sleep.', at: 1, resolved: true },
  ],
  pending: [],
};

describe('MEMORY.md', () => {
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
