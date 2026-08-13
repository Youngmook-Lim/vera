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
      impressions: [{ text: 'Deflects with questions.', at: 'JUL 30' }],
    });
    const view = await render(<FileScreen />);
    const body = view.getByTestId('file-body').props.children as string;
    expect(body).toContain('entries: 1');
    expect(body).toContain('Deflects with questions.');
  });

  // This screen is a window onto her state, not a part of the fiction. Sealing
  // is gone entirely: there is no second audience to withhold anything from,
  // so nothing here is ever masked.
  it('never masks an entry', async () => {
    useFacilityStore.setState({
      view: 'mem', lang: 'en', cleared: 0,
      impressions: [{ text: 'Lies about sleep.', at: 'JUL 30' }],
    });
    const view = await render(<FileScreen />);
    const body = view.getByTestId('file-body').props.children as string;
    expect(body).toContain('Lies about sleep.');
    expect(body).not.toContain('REDACTED');
    expect(body).not.toContain('SEALED');
    expect(body).not.toContain('sealed');
  });

  // Stored order, oldest first, indexed — so a line on screen can be matched
  // against a position in the persisted array without counting backwards.
  it('prints entries in stored order, with their index and date', async () => {
    useFacilityStore.setState({
      view: 'mem', lang: 'en', cleared: 2,
      impressions: [
        { text: 'Deflects with questions.', at: 'JUL 30' },
        { text: 'Lies about sleep.', at: 'AUG 01' },
      ],
    });
    const view = await render(<FileScreen />);
    const body = view.getByTestId('file-body').props.children as string;
    expect(body).toContain('[0] JUL 30  Deflects with questions.');
    expect(body).toContain('[1] AUG 01  Lies about sleep.');
    expect(body.indexOf('[0]')).toBeLessThan(body.indexOf('[1]'));
    expect(body).toContain('entries: 2');
    expect(body).toContain('erasures: 2');
  });

  it('reports an empty file plainly', async () => {
    useFacilityStore.setState({ view: 'mem', lang: 'en', impressions: [], cleared: 0 });
    const view = await render(<FileScreen />);
    expect(view.getByTestId('file-body').props.children).toContain('(empty)');
  });
});
