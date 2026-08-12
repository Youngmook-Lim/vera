import React from 'react';
import { render } from '@testing-library/react-native';
import { useFacilityStore } from '../../core/store';
import { FileScreen } from '../FileScreen';

describe('FileScreen', () => {
  it('renders SOUL.md as the document itself', async () => {
    useFacilityStore.setState({ view: 'soul', lang: 'en' });
    const view = await render(<FileScreen />);
    expect(view.getByTestId('file-body').props.children).toContain('# SOUL.md');
  });

  it('builds MEMORY.md from her impressions', async () => {
    useFacilityStore.setState({
      view: 'mem', lang: 'en', cleared: 0,
      impressions: [{ text: 'Deflects with questions.', at: 'JUL 30', sealed: false }],
    });
    const view = await render(<FileScreen />);
    const body = view.getByTestId('file-body').props.children as string;
    expect(body).toContain('entries: 1');
    expect(body).toContain('Deflects with questions.');
  });

  // A sealed entry stays in her file and in her reasoning; you see only that
  // something was withheld.
  it('withholds a sealed entry', async () => {
    useFacilityStore.setState({
      view: 'mem', lang: 'en', cleared: 0,
      impressions: [{ text: 'Lies about sleep.', at: 'JUL 30', sealed: true }],
    });
    const view = await render(<FileScreen />);
    const body = view.getByTestId('file-body').props.children as string;
    expect(body).toContain('[REDACTED BY ADMINISTRATOR]');
    expect(body).not.toContain('Lies about sleep.');
  });

  // Critical: a sealed entry's real text must never reach the render tree at
  // all, not just be absent from the body's own children string — checking
  // the whole serialized tree catches a leak through any other prop.
  it('never renders a sealed entry\'s real text anywhere in the tree', async () => {
    useFacilityStore.setState({
      view: 'mem', lang: 'en', cleared: 0,
      impressions: [{ text: 'Lies about sleep.', at: 'JUL 30', sealed: true }],
    });
    const view = await render(<FileScreen />);
    const serialized = JSON.stringify(view.toJSON());
    expect(serialized).not.toContain('Lies about sleep.');
  });

  // The entry still counts toward the total even though its text is withheld.
  it('still counts a sealed entry toward the total', async () => {
    useFacilityStore.setState({
      view: 'mem', lang: 'en', cleared: 0,
      impressions: [{ text: 'Lies about sleep.', at: 'JUL 30', sealed: true }],
    });
    const view = await render(<FileScreen />);
    const body = view.getByTestId('file-body').props.children as string;
    expect(body).toContain('entries: 1');
    expect(body).toContain('sealed: 1');
  });

  it('says so when there is nothing on file yet', async () => {
    useFacilityStore.setState({ view: 'mem', lang: 'en', impressions: [], cleared: 0 });
    const view = await render(<FileScreen />);
    expect(view.getByTestId('file-body').props.children).toContain('(none yet. give her material.)');
  });
});
