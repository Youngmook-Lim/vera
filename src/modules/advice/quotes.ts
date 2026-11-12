// The deck the advice room deals from. Two corpora fit this shape:
//
//   quotes.local.ts   the real one — 232 highlights from a Kindle export of
//                     Kevin Kelly's `Excellent Advice for Living`. A personal
//                     build only: gitignored and never committed, because the
//                     text is not ours to publish.
//   quotes.sample.ts  placeholder lines written for this repo, so a fresh clone
//                     builds, runs and tests.
//
// The local file wins when it exists. The require is optional (Metro bundles it
// only if the file is there; see metro.config.js), and Jest is pointed away from
// it (jest/no-local-corpus.js), so the suite is the same on every machine.
import * as sample from './quotes.sample';

export interface AdviceSource {
  readonly title: string;
  readonly shortTitle: string;
  readonly author: string;
}

interface Corpus {
  readonly SOURCE: AdviceSource;
  readonly QUOTES: readonly string[];
}

const load = (): { corpus: Corpus; kind: 'full' | 'sample' } => {
  try {
    return { corpus: require('./quotes.local') as Corpus, kind: 'full' };
  } catch {
    return { corpus: sample, kind: 'sample' };
  }
};

const loaded = load();

export const SOURCE: AdviceSource = loaded.corpus.SOURCE;
export const QUOTES: readonly string[] = loaded.corpus.QUOTES;
export const CORPUS: 'full' | 'sample' = loaded.kind;
