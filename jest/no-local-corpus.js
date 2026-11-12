// Jest maps every `./*.local` corpus import here (see "moduleNameMapper" in
// package.json), so the suite always runs against the committed sample decks
// and gives the same result on every machine, whether or not the gitignored
// real corpora have been built locally. Throwing is the point: the corpus
// modules catch it and fall back to their sample.
throw new Error('local corpora are not loaded under Jest');
