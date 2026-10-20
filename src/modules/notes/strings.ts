import type { Strings } from '../../core/i18n';

// This room's copy. The only room whose content the subject writes, so its
// chrome stays out of the way: plain, lowercase where the other rooms' hints
// are, and never in her institutional register. Every other surface in this
// building is hers; this one is theirs.

interface NotesStrings {
  label: string;
  empty: string;
  newNote: string;
  placeholder: string;
  time: string;
  days: string;
  save: string;
  del: string;
  full: string;
  // Indexed by Date.getDay(), so [0] is Sunday in both languages.
  // DISPLAY_ORDER is what puts them Monday-first — never a second array in a
  // different order, which would be a fourth indexing of the same thing.
  dayNames: readonly string[];
}

const en: NotesStrings = {
  label: 'NOTES TO MYSELF',
  empty: 'nothing written yet',
  newNote: '+ NEW NOTE',
  placeholder: 'write it as you want to read it',
  time: 'TIME',
  days: 'DAYS',
  save: 'SAVE',
  del: 'DELETE',
  full: 'twenty is the limit',
  dayNames: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
};

const ko: NotesStrings = {
  label: '나에게 쓰는 메모',
  empty: '아직 쓴 메모가 없어요',
  newNote: '+ 새 메모',
  placeholder: '읽고 싶은 대로 써 두세요',
  time: '시간',
  days: '요일',
  save: '저장',
  del: '삭제',
  full: '스무 개까지예요',
  dayNames: ['일', '월', '화', '수', '목', '금', '토'],
};

export const T: Strings<NotesStrings> = { en, ko };
