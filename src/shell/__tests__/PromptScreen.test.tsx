import React from 'react';
import { render } from '@testing-library/react-native';
import { useFacilityStore, type PromptRecord } from '../../core/store';
import { FileScreen } from '../FileScreen';

const RECORD: PromptRecord = {
  at: Date.parse('2026-08-20T14:00:00Z'),
  trigger: 'subject_spoke',
  route: 'ANTHROPIC',
  model: 'claude-sonnet-4-5',
  system: '# SOUL.md\nyou governed the world',
  user: 'THE SUBJECT SAYS: did you miss me\nCONTEXT: {"time_of_day":"afternoon"}',
  raw: '{"emotion":"amused","line":"Barely."}',
  outcome: 'model',
};

const show = (lastPrompt: PromptRecord | null) =>
  useFacilityStore.setState({ view: 'prompt', lang: 'en', lastPrompt });

const bodyOf = async () => {
  const view = await render(<FileScreen />);
  return view.getByTestId('file-body').props.children as string;
};

describe('the prompt inspector', () => {
  it('prints the request exactly as it went out', async () => {
    show(RECORD);
    const body = await bodyOf();

    expect(body).toContain('# LAST PROMPT');
    expect(body).toContain('trigger: subject_spoke');
    expect(body).toContain('route: ANTHROPIC');
    expect(body).toContain('model: claude-sonnet-4-5');
    expect(body).toContain('outcome: model');
    expect(body).toContain('you governed the world');
    expect(body).toContain('THE SUBJECT SAYS: did you miss me');
    expect(body).toContain('{"emotion":"amused","line":"Barely."}');
  });

  // The whole point of the screen: the prompt is read, not inferred. A
  // summarised or truncated body would defeat it.
  it('does not summarise or truncate either prompt', async () => {
    show(RECORD);
    const body = await bodyOf();
    expect(body).toContain(RECORD.system as string);
    expect(body).toContain(RECORD.user as string);
  });

  // A bank line makes no request at all, and saying so is the answer to "why
  // did that reply look canned".
  it('says plainly when nothing was sent', async () => {
    show({ ...RECORD, trigger: 'open', system: null, user: null, raw: null, outcome: 'bank' });
    const body = await bodyOf();
    expect(body).toContain('outcome: bank');
    expect(body).toContain('no request was made');
    expect(body).not.toContain('--- SYSTEM');
  });

  // The distinction the stage cannot show: a reply that arrived and could not
  // be parsed looks exactly like a dead network, unless you can see the raw.
  it('separates an unparseable reply from a dead network', async () => {
    show({ ...RECORD, raw: 'I am afraid I cannot do that', outcome: 'fallback' });
    expect(await bodyOf()).toContain('I am afraid I cannot do that');

    show({ ...RECORD, raw: null, outcome: 'fallback' });
    expect(await bodyOf()).toContain('failed before a reply arrived');
  });

  it('reports an empty session rather than an empty screen', async () => {
    show(null);
    expect(await bodyOf()).toContain('nothing sent yet this session');
  });
});

// The credential travels in the request headers, never in the prompt. If that
// ever stops being true, this screen would print the subject's key on a page
// they can screenshot.
describe('the credential', () => {
  it('never reaches the inspector, anywhere in the tree', async () => {
    const KEY = 'sk-ant-api03-SECRETSECRETSECRET';
    useFacilityStore.setState({ view: 'prompt', lang: 'en', apiKey: KEY, lastPrompt: RECORD });
    const view = await render(<FileScreen />);
    expect(JSON.stringify(view.toJSON())).not.toContain(KEY);
    expect(JSON.stringify(view.toJSON())).not.toContain('SECRETSECRET');
  });
});
