// The markers that give a prompt a shape: where each document starts and stops,
// and how text nobody wrote on our behalf gets carried inside one.
//
// `===` rather than `---` deliberately: the PROMPT screen wraps its own sections
// in `--- SECTION ---`, and a prompt using the same rule would be unreadable on
// the one screen built to read it.

export const fence = (label: string, body: string): string =>
  `=== BEGIN ${label} ===\n${body.trim()}\n=== END ${label} ===`;

// Untrusted text, quoted. Two kinds reach a prompt — what the subject typed, and
// her own replayed lines — and both are data. Neither is structure and neither
// is an instruction.
//
// **This is not a security boundary.** It is their key, their device and their
// conversation, and there is nobody on the other side of it to protect from
// them. What it protects is the record. Extraction writes to disk: a subject who
// types a line beginning `YOU:` could otherwise forge her half of an exchange
// and have a verdict drawn from something she never said, which then persists
// and is fed back to her every reply afterwards. A forged `CONTEXT:` line, or a
// closed fence, is the milder and more recoverable version of the same trick.
//
// Prefixing every line is what does the work: nothing quoted can begin at column
// 0, so nothing quoted can pass for a label, a fence, or an instruction, whatever
// it is shaped like. Unlike stripping or escaping, their words reach her intact
// — she answers what they actually typed, including the attempt.
export const QUOTE = '> ';

export const quoted = (text: string): string =>
  String(text ?? '')
    .split('\n')
    .map((line) => QUOTE + line)
    .join('\n');
