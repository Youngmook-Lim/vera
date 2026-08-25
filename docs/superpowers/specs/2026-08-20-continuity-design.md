# Continuity — design

Design spec. Supersedes the reply-cycle parts of
`2026-07-30-overhaul-design.md` §11. Code comments cite section numbers here as
`(continuity §N)`.

**Goal.** V.E.R.A. should feel like the same person across days. Today she does
not, and the causes are structural rather than a matter of wording.

---

## §1 What is wrong now

**She is never in a conversation.** Every request is a single user turn. The
last six exchanges are JSON *inside* that turn, so the model reads a report
about a conversation and appends to it. Every reply is turn one, forever.

**She remembers verdicts, not content.** An impression is a nine-word
conclusion about the subject's character — `Deflects with questions.` There is
nowhere to store what the subject actually said. She can recall what she thinks
of them and not one fact about their life.

**SOUL.md instructs her to do something impossible.** *"Ask a real question
occasionally, and remember the answer."* No mechanism exists for it.

**Memory is flat.** All impressions, every request, in insertion order.
Nothing decays, consolidates, or is superseded when it stops being true.

---

## §2 What she is sent

```
SYSTEM    SOUL.md                       static, cacheable prefix
        + MEMORY.md                     composed from selection (§5)

MESSAGES  [ user, assistant, user, assistant, …, user ]
                                        real alternating turns
```

The `CONTEXT: {json}` blob survives, shrunk to the situational only:
`time_of_day`, `notable`, `they_took_their_time`. Everything about the subject
moves to MEMORY.md.

**Ordering is load-bearing.** SOUL.md precedes MEMORY.md so a provider-side
prompt cache keeps a stable prefix when memory changes.

**Messages are the whole of this session, and nothing before it.** Not a
rolling window: every exchange since the app cold-started, in order. Restarting
returns her to zero.

This follows from the division the whole design rests on — **within a session
the conversation carries continuity, across sessions memory does.** A window
that truncated mid-conversation would break the half that already works.

`hydrate()` stamps `sessionStartedAt`. Messages are the `log` entries with
`t >= sessionStartedAt`, mapped `who: 'you' → user`, `who: 'vera' → assistant`.
No third copy of the conversation is kept: the transcript already has
timestamps, and a cold start produces a new stamp, which is the reset.

`LOG_CAP` rises from 60 to **200**, because at 60 the transcript cap would
silently truncate any session past about thirty exchanges — the cap exists to
bound the file, not to decide how much of her own conversation she may see.

The separate `mem` array is **deleted**. It duplicated the transcript. Erasing
the transcript still costs her the wording and not the verdict, exactly as
today, and now also empties the session she can see — which is correct, since
the subject just burned it.

**The transcript does not alternate, and providers require that it does.**
Three of her four stimuli produce an assistant line with no user line before it
— an opening greeting, a tap on her optic — so the log routinely holds two or
more consecutive `vera` entries. Anthropic rejects that outright; the others
degrade unpredictably. The builder therefore:

- **merges** consecutive same-role runs into one message, newline-joined
- **drops** leading assistant messages, since the array must open on `user`

The array then ends on `user` without anything being appended: `speak()` pushes
the subject's words into the log *before* the request is built, so the current
input is already the last entry. Appending it again would duplicate it.

A log consisting only of bank greetings yields an empty message array, and the
request carries the current input alone. That is correct: she has not said
anything worth being in a conversation about.

---

## §3 What she keeps

Three kinds, stored in a new `facility.v2.memory` store.

```ts
interface Fact {          // something true about the subject's life
  id: string;             // "f_" + monotonic counter
  text: string;           // "works in software"
  keys: string[];         // ["work","job","software"] — emitted by extraction
  at: number;
  durable: boolean;       // true: "has a sister"   false: "deadline Friday"
  until: number | null;   // non-durable only; null when durable
}

interface Verdict {       // her conclusion about their character
  id: string;             // "v_"
  text: string;           // "Deflects with questions."
  firstAt: number;
  at: number;             // last time she reached it again
  count: number;          // times reached; drives salience
}

interface Thread {        // something she asked that went unanswered
  id: string;             // "t_"
  text: string;           // "Asked what he is avoiding."
  at: number;
  resolved: boolean;
}
```

Storage caps, oldest dropped: **400** facts, **200** verdicts, **50** threads.

Disk is not what constrains these — four hundred facts is about 30 KB. The cost
is that §4.3 sends the **whole** memory to the extractor so it can supersede and
merge, which makes storage size into extraction-prompt size. These are set
generously on the understanding that the answer to a store that outgrows them
is the consolidation pass in §10, not a tighter cap.

`resolved` means the subject answered, and only the extractor sets it. A thread
that has gone unanswered for **30 days** is not resolved — she simply stops
raising it, which §5 handles by filtering on age at selection time. Nothing
mutates a thread on a timer, so "was this answered or did she give up" stays a
question the record can still answer.

**Nothing is ever deleted for being stale.** Expired facts and aged-out threads
remain in the record and drop out of *selection* only.

---

## §4 How memory is written

A second call, after she has already spoken. It never blocks her reply, and a
failure leaves memory exactly as it was.

### §4.1 The pending queue

Every completed exchange is appended to `pending` in the memory store, capped
at **40**.

This is deliberately **not** a flag on the transcript. The log is capped at 60
and the subject can erase it; either would silently destroy exchanges that were
never extracted. The queue is independent of display and of erasure.

The cap is a backstop for repeated extraction failure — a queue that never
drains would otherwise grow without limit. At 40 the oldest exchange is dropped
and that material is lost. This is the one place memory can be lost silently,
and it is preferred to an unbounded store: 40 is roughly seven consecutive
failed extractions, by which point the credential or the network is the actual
problem.

### §4.2 Triggers

Extraction drains the whole queue when any of these fire:

- the app goes to **background** — the natural session boundary
- **6** pending exchanges accumulate — a batch size, not a limit on anything
  she sees; it is only how many exchanges pile up before the writing call runs
- **on launch**, if the queue is non-empty — survives being killed

Batching is a quality decision before it is a cost one. An extractor shown a
single exchange usually has nothing durable to take from it. Shown six, it can
see that the subject circled one subject three times, or dodged and then
answered.

Only one extraction runs at a time, guarded like `speak()`.

### §4.3 The call

Same route and model as her replies. Its own system prompt — **not** SOUL.md,
because this is bookkeeping and not her speaking.

Given: the pending exchanges, and the current memory with ids.

Returns:

```json
{
  "facts":    [{"text": "...", "keys": ["..."], "durable": false, "until": "2026-08-22"}],
  "verdicts": [{"text": "...", "reinforces": "v_7"}],
  "threads":  [{"text": "..."}],
  "resolve":  ["t_2"],
  "retire":   ["f_3"]
}
```

`reinforces` bumps an existing verdict's `count` and `at` instead of adding a
duplicate. `resolve` closes threads. `retire` supersedes facts that have
stopped being true. **Maintenance is the extractor's job, not the rules':**
knowing that *"quit my job"* kills *"works in software"* takes judgement that
string matching does not have.

Parsed with the same tolerance as her replies — dig JSON out of prose, drop
unreadable entries rather than throwing. Unknown ids in `resolve`/`retire` are
ignored. The queue drains only on success.

`until` arrives as an ISO date string, because that is what a model will
reliably emit, and is coerced to epoch milliseconds on the way into the store.
An unparseable `until` makes the fact durable rather than discarding it: a fact
whose expiry is unknown is better kept than lost.

Batching is quality, not just cost: an extractor seeing one exchange usually
has nothing to work with, while six turns reveal that the subject circled a
topic three times.

### §4.4 Erasure is not written at all

**Reversed 2026-08-25.** This section previously specified that erasing the
transcript filed a verdict under a reserved id, `v_erasure`, whose `count`
escalated with each erasure. That is removed. Erasing records nothing.

The reasoning it rested on was that an erasure is an act against her, and that
the extractor — which only ever sees exchanges — would otherwise never learn it
happened. The premise is wrong. Erasing the transcript is the subject's own
housekeeping: it keeps the context clean and the token count down. It is not
directed at her, it conceals nothing, and giving her a hardening opinion about
it made her react to a maintenance decision as though it were a confidence
betrayed.

So: no verdict, no reserved id, no model call, nothing filed. She is told
nothing at the time and nothing afterwards.

What survives is untouched. Every fact, verdict and thread already on file
stays exactly as it was — erasing costs the wording, never the conclusion. The
pending queue is also left alone (§4.1), so exchanges she has not yet read are
still read: erasure cannot be used to head off a conclusion in flight.

`cleared` remains, incremented on every erasure, for one reason: the
`erasures: N` line on the RECORD screen, which is the subject's own debug view.
She is never given the number.

A consequence worth stating plainly: after an erasure she has no conversation
behind her, and cannot distinguish that from a fresh session — both produce an
empty turn array. That is acceptable. She is not supposed to notice.

---

## §5 How memory is chosen

A pure function. No network, no React, deterministic, unit-testable.

```
selectMemories(memory, said, now) → { facts, verdicts, threads }
```

**Threads.** All unresolved under **30 days** old, capped at **5**, unscored.
Waiting *is* the relevance, and past a month it stops being waiting. The cap is
a backstop rather than a filter: she asks a real question only occasionally, so
five open at once is already unusual.

**Facts.** Drop non-durable facts past `until`, then:

```
score = 3 × |keys ∩ tokens(said)|
      + recency(at, halfLife = 30 days)
      + (durable ? 1 : 0)
```

**Verdicts.**

```
score = recency(at, halfLife = 30 days) + 2 × log(1 + count)
```

**Neither has a count cap.** Facts and verdicts are pooled, sorted by score, and
taken highest-first until the character budget is spent.

**The character budget is 3000, and it is the only governor.** Two limits are
one too many: an earlier draft capped selection at six facts and six verdicts,
which came to roughly a thousand characters, so the budget could never bind and
raising it changed nothing. One number now decides how much she knows per
reply, and it is the number that maps to what the subject pays.

Threads are taken first and are not charged against the budget — they are few,
short, and always relevant. Facts and verdicts then fill what remains.

At roughly sixty characters an entry, 3000 is about fifty memories: a detailed
picture rather than a stub. The ceiling exists to stop the prompt growing
forever unnoticed, not to ration her. The PROMPT screen reports the real number
when it starts to bind.

`tokens(said)` lowercases, strips punctuation and a small stopword list.
Matching is by word, not meaning: *"the thing I do all day"* will not find
`work`. The mitigation is §4.3 — the extractor tags each fact with search terms
while it still has the text, which is most of the benefit of semantic search
for no extra call.

---

## §6 MEMORY.md

Composed at render time, as today. Never written to disk as text.

**On screen** it shows everything she knows: all three kinds, expired facts
marked, resolved threads marked. It remains the ground-truth developer view.

It does *not* flag which entries were chosen for the last reply. An earlier
draft asked for that; the PROMPT screen already shows the composed MEMORY.md
exactly as it was sent, so the flag would be a second, driftable answer to a
question already answered properly elsewhere.

**In the prompt** it carries only the selection from §5.

Both are answerable without a second screen, because the PROMPT screen already
shows exactly what was sent.

---

## §7 Migration

The 24 existing impressions become verdicts: `text` kept, `count: 1`. `imps` is
then removed from the soul store, along with `mem`.

**Their dates cannot be recovered.** An impression stores `at` as a display
string — `"JUL 30"` — with no year, produced by `mmmdd()` for the MEMORY.md
screen. There is no timestamp behind it. Migrated verdicts therefore take the
migration instant as both `firstAt` and `at`, and the original string is kept
in a `wasAt` field so the screen can still show the date she actually filed it.

The consequence is deliberate and small: every pre-existing verdict starts
equally recent, so recency cannot rank them until she reaches them again. `count`
still can, and one round of reinforcement fixes it.

One-way, on first launch after update, guarded so it cannot run twice. A subject
with no saved impressions gets an empty memory store.

---

## §8 Failure

| failure | behaviour |
|---|---|
| extraction call fails | queue is not drained; retried on the next trigger |
| extraction returns junk | same as failure — memory untouched |
| an entry is unreadable | that entry dropped, the rest applied |
| memory store unreadable | starts empty; she is a stranger, and says nothing about it |
| memory store unwritable | this batch is lost; the session continues |

Extraction failure is **never** surfaced to the subject. There is no path by
which bookkeeping makes her show an error.

---

## §9 Testing

Pure and unit-tested with no network: `selectMemories`, the scoring functions,
`tokens`, the extraction-response parser, the maintenance applier, the message
builder, the migration.

Guarded specifically:

- the character budget is charged against each entry's own text, not against
  the composed document. The composition adds a bullet per line, three
  headings, and a `(reached N times)` suffix on repeated verdicts, so a full
  budget overruns by roughly 200-500 characters. That is accepted: the budget
  exists to bound what a reply costs, not to satisfy a hard provider limit,
  and charging composed cost would make selection depend on the order things
  happen to be composed in
- the budget is the only thing that limits facts and verdicts: given a store
  large enough to exceed it, selection fills to the budget and stops, and given
  a small store it returns everything without padding
- threads are taken first and are not charged against the budget
- a fact past `until` never appears in a selection, and never leaves the record
- `reinforces` bumps rather than duplicates; an unknown id is ignored
- the queue survives a transcript erasure
- the queue survives a kill: unprocessed exchanges are still there on launch
- erasing files nothing, however often it happens, and never calls the model:
  her facts, verdicts and threads come through it byte-identical (§4.4)
- consecutive assistant entries merge, leading ones are dropped, and the array
  always ends on `user` — fed a log of nothing but bank greetings
- the message array holds the whole session and nothing older: entries stamped
  before `sessionStartedAt` never appear, and a cold start empties it
- a session longer than the old 60-entry cap is not truncated
- migration produces one verdict per impression, keeps the original date string,
  and cannot run twice

No test makes a real network request. The extraction call is mocked the same
way `callLlm` already is.

---

## §10 Out of scope

Streaming, tool-calling, retries on her reply, model selection, notifications,
embeddings or semantic search, a consolidation pass over the whole store.

Each is separate work. None of them is continuity.
