import React from 'react';
import { render } from '@testing-library/react-native';
import { useFacilityStore, type ExtractRecord, type PromptRecord } from '../../core/store';
import { FileScreen } from '../FileScreen';

const RECORD: PromptRecord = {
  at: Date.parse('2026-08-20T14:00:00Z'),
  trigger: 'subject_spoke',
  route: 'ANTHROPIC',
  model: 'claude-sonnet-5',
  system: '# SOUL.md\nyou governed the world',
  turns: [
    { role: 'user', text: 'are you there' },
    { role: 'assistant', text: 'Regrettably.' },
    { role: 'user', text: 'THE SUBJECT SAYS: did you miss me\nCONTEXT: {"time_of_day":"afternoon"}' },
  ],
  raw: '{"emotion":"amused","line":"Barely."}',
  failure: null,
  emotion: 'amused',
  line: 'Barely.',
  notice: null,
  took: 1840,
  outcome: 'model',
};

const EXTRACT: ExtractRecord = {
  at: Date.parse('2026-08-20T14:00:04Z'),
  route: 'ANTHROPIC',
  model: 'claude-sonnet-5',
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
    expect(body).toContain('model: claude-sonnet-5');
    expect(body).toContain('outcome: model');
    expect(body).toContain('you governed the world');
    expect(body).toContain('THE SUBJECT SAYS: did you miss me');
    expect(body).toContain('{"emotion":"amused","line":"Barely."}');
  });

  // The clamp made visible. parseSpeech turns any word that is not one of her
  // states into `calm`, and on the stage that is indistinguishable from her
  // having chosen calm. The two lines together are the only place it shows.
  it('prints the state the optic took, beside the one she asked for', async () => {
    show({ ...RECORD, raw: '{"emotion":"wry","line":"Barely."}', emotion: 'calm' });
    const body = await bodyOf();

    expect(body).toContain('emotion: calm');
    expect(body).toContain('"emotion":"wry"');
  });

  // The one thing the screen could not show: the output. Everything else here
  // describes the request, and a screenshot of it could not be read against the
  // stage it came from without knowing which line it produced.
  it('prints the line the subject actually saw', async () => {
    show(RECORD);
    expect(await bodyOf()).toContain('spoke: Barely.');
  });

  // Under a notice the app speaks in its own voice and her line is discarded on
  // the way to the screen. From the transcript alone that is indistinguishable
  // from her having had nothing to say.
  it('says when the app spoke instead of her, and what she would have said', async () => {
    show({ ...RECORD, outcome: 'fallback', notice: 'quota', emotion: 'dormant', line: 'Something has failed.' });
    const body = await bodyOf();

    expect(body).toContain('the app showed its own quota notice instead');
    expect(body).toContain('her unshown line: Something has failed.');
  });

  // A hung socket sits at the 25s cap, a refusal returns instantly, and a slow
  // provider is neither. All three used to read the same.
  it('prints how long the round trip took', async () => {
    show(RECORD);
    expect(await bodyOf()).toContain('took: 1840ms');
  });

  // The verdict in the header, rather than left to be inferred from an outcome
  // printed several lines above it.
  it('says in the header when a reply arrived and could not be read', async () => {
    show({ ...RECORD, raw: 'V.E.R.A. Not an assistant.', outcome: 'fallback', emotion: 'dormant' });
    const body = await bodyOf();

    expect(body).toContain('COULD NOT BE READ');
    expect(body).toContain(`(${'V.E.R.A. Not an assistant.'.length} chars`);
  });

  // A reply that parsed must not be labelled, or the label means nothing.
  it('does not label a reply that was read', async () => {
    show(RECORD);
    expect(await bodyOf()).not.toContain('COULD NOT BE READ');
  });

  // The failure the length is the only clue to: a reply cut off by the token
  // budget is valid text that stops mid-object, and reads as an ordinary
  // parse failure without a count to weigh it against.
  it('prints the length of the raw reply, so a truncated one shows', async () => {
    const cut = `{"emotion":"calm","line":"${'a'.repeat(400)}`;
    show({ ...RECORD, raw: cut, outcome: 'fallback', emotion: 'dormant' });
    expect(await bodyOf()).toContain(`(${cut.length} chars, COULD NOT BE READ)`);
  });

  it('labels an extraction that arrived and could not be read', async () => {
    show(RECORD, { ...EXTRACT, raw: 'not json at all', outcome: 'unparseable' });
    expect(await bodyOf()).toContain('COULD NOT BE READ');
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

  // This screen is about requests, and a stimulus answered from the bank makes
  // none. It is no longer recorded at all (the store side is pinned by 'leaves
  // the last real prompt standing' in store.test.ts), so the screen has no
  // bank case left to render — every record it can be handed has a system
  // prompt in it.
  it('always has a system prompt to show', async () => {
    show({ ...RECORD });
    const body = await bodyOf();
    expect(body).toContain('--- SYSTEM');
    expect(body).not.toContain('no request was made');
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

  it('says what became of her voice, and nothing when she was not asked to speak', async () => {
    show({ ...RECORD, voice: { took: 1200 } });
    expect(await bodyOf()).toContain('voice: 1200ms');
    show({ ...RECORD, voice: { cached: true } });
    expect(await bodyOf()).toContain('voice: cached');
    show({ ...RECORD, voice: { failure: 'http 402: Insufficient credits' } });
    expect(await bodyOf()).toContain('voice: failed: http 402: Insufficient credits');
    show(RECORD);
    expect(await bodyOf()).not.toContain('voice:');
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
