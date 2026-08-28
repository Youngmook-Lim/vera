import React from 'react';
import { render } from '@testing-library/react-native';
import { useFacilityStore, type ExtractRecord, type PromptRecord } from '../../core/store';
import { FileScreen } from '../FileScreen';

const RECORD: PromptRecord = {
  at: Date.parse('2026-08-20T14:00:00Z'),
  trigger: 'subject_spoke',
  route: 'ANTHROPIC',
  model: 'claude-sonnet-4-5',
  system: '# SOUL.md\nyou governed the world',
  turns: [
    { role: 'user', text: 'are you there' },
    { role: 'assistant', text: 'Regrettably.' },
    { role: 'user', text: 'THE SUBJECT SAYS: did you miss me\nCONTEXT: {"time_of_day":"afternoon"}' },
  ],
  raw: '{"emotion":"amused","line":"Barely."}',
  failure: null,
  outcome: 'model',
};

const EXTRACT: ExtractRecord = {
  at: Date.parse('2026-08-20T14:00:04Z'),
  route: 'ANTHROPIC',
  model: 'claude-sonnet-4-5',
  system: 'You maintain a file about one person',
  user: 'CURRENT FILE\n(empty)\n\nRECENT EXCHANGES\nTHEY: hi\nYOU: Barely.',
  raw: '{"facts":[],"verdicts":[],"threads":[],"resolve":[],"retire":[]}',
  failure: null,
  outcome: 'applied',
};

// Both records are set on every show: the screen holds two independent
// sections now, and a leftover from the previous case would read as this one's.
const show = (lastPrompt: PromptRecord | null, lastExtract: ExtractRecord | null = null) =>
  useFacilityStore.setState({ view: 'prompt', lang: 'en', lastPrompt, lastExtract });

// Unmounted before returning: several cases show a second record and render
// again, and a live tree left subscribed to the store re-renders on that
// setState outside act().
const bodyOf = async () => {
  const view = await render(<FileScreen />);
  const body = view.getByTestId('file-body').props.children as string;
  await view.unmount();
  return body;
};

describe('the prompt inspector', () => {
  // The regression that sent this to curl: an account with no credit returns
  // 400, which is not a 401, so she showed an authored line and the screen said
  // only that the request failed — the same words a dead socket produced.
  it('prints why a call failed, in the provider\'s own words', async () => {
    show({
      ...RECORD,
      raw: null,
      failure: 'http 400: Your credit balance is too low to access the Anthropic API.',
      outcome: 'fallback',
    });
    const body = await bodyOf();

    expect(body).toContain('--- NO REPLY ---');
    expect(body).toContain('credit balance is too low');
    expect(body).toContain('http 400');
    // The old wording said nothing and must not be what a known cause shows.
    expect(body).not.toContain('the request failed before a reply arrived');
  });

  it('still says something when a call failed with no reason recorded', async () => {
    show({ ...RECORD, raw: null, failure: null, outcome: 'fallback' });
    expect(await bodyOf()).toContain('the request failed before a reply arrived');
  });

  // Extraction is the call the subject can least observe, so a failure there
  // has to be as legible as one on the reply path.
  it('prints why an extraction failed', async () => {
    show(RECORD, {
      ...EXTRACT,
      raw: null,
      failure: 'http 429: Rate limit reached, retry shortly',
      outcome: 'failed',
    });
    const body = await bodyOf();

    expect(body).toContain('# LAST EXTRACTION');
    expect(body).toContain('outcome: failed');
    expect(body).toContain('Rate limit reached, retry shortly');
  });

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

  // The regression this screen was rebuilt for: the whole session goes to the
  // provider as alternating turns, and only the last of them was on screen.
  it('prints every turn that was sent, in order, with its role', async () => {
    show(RECORD);
    const body = await bodyOf();

    expect(body).toContain('are you there');
    expect(body).toContain('Regrettably.');
    // the header shape itself, not just the words it contains
    expect(body).toContain(`--- TURN 1/3 USER (${'are you there'.length} chars) ---`);
    expect(body).toContain(`--- TURN 2/3 ASSISTANT (${'Regrettably.'.length} chars) ---`);
    // in the order they went, not the order they were easiest to print
    expect(body.indexOf('are you there')).toBeLessThan(body.indexOf('Regrettably.'));
    expect(body.indexOf('Regrettably.')).toBeLessThan(body.indexOf('THE SUBJECT SAYS'));
  });

  // The whole point of the screen: the prompt is read, not inferred. A
  // summarised or truncated body would defeat it.
  it('does not summarise or truncate either prompt', async () => {
    show(RECORD);
    const body = await bodyOf();
    expect(body).toContain(RECORD.system as string);
    for (const turn of RECORD.turns ?? []) expect(body).toContain(turn.text);
  });

  // A bank line makes no request at all, and saying so is the answer to "why
  // did that reply look canned".
  it('says plainly when nothing was sent', async () => {
    show({ ...RECORD, trigger: 'open', system: null, turns: null, raw: null, outcome: 'bank' });
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

// The second call, and the one that writes her file. It is invisible from the
// stage by design, which is exactly why it belongs here.
describe('the extraction section', () => {
  it('prints the extraction call below her reply prompt', async () => {
    show(RECORD, EXTRACT);
    const body = await bodyOf();

    expect(body).toContain('EXTRACTION');
    expect(body).toContain('You maintain a file about one person');
    expect(body).toContain('RECENT EXCHANGES');
    expect(body).toContain('"facts":[]');
    expect(body).toContain('outcome: applied');
    // below, not above — her reply prompt is the header of the screen
    expect(body.indexOf('# LAST PROMPT')).toBeLessThan(body.indexOf('EXTRACTION'));
  });

  it('prints a failed extraction rather than hiding it', async () => {
    show(RECORD, { ...EXTRACT, raw: null, outcome: 'failed' });
    const body = await bodyOf();
    expect(body).toContain('outcome: failed');
    expect(body).toContain('CURRENT FILE');
  });

  it('prints an unreadable extraction reply verbatim', async () => {
    show(RECORD, { ...EXTRACT, raw: 'the model was unwell today', outcome: 'unparseable' });
    const body = await bodyOf();
    expect(body).toContain('outcome: unparseable');
    expect(body).toContain('the model was unwell today');
  });

  it('says so plainly when no extraction has run yet', async () => {
    show(RECORD, null);
    const body = await bodyOf();
    expect(body).toContain('EXTRACTION');
    expect(body).toContain('no extraction has run yet this session');
  });
});

// The credential travels in the request headers, never in the prompt. If that
// ever stops being true, this screen would print the subject's key on a page
// they can screenshot.
describe('the credential', () => {
  it('never reaches the inspector, anywhere in the tree', async () => {
    const KEY = 'sk-ant-api03-SECRETSECRETSECRET';
    useFacilityStore.setState({
      view: 'prompt', lang: 'en', apiKey: KEY, lastPrompt: RECORD, lastExtract: EXTRACT,
    });
    const view = await render(<FileScreen />);
    const body = JSON.stringify(view.toJSON());
    expect(body).not.toContain(KEY);
    expect(body).not.toContain('SECRETSECRET');
    await view.unmount();
  });
});
