import { T } from '../strings';

test('en and ko expose identical keys', () => {
  expect(Object.keys(T.ko).sort()).toEqual(Object.keys(T.en).sort());
});

test('chrome copy is verbatim from the design doc T table', () => {
  expect(T.en.conv).toBe('OPEN CONVERSATION');
  expect(T.en.gateTitle).toBe('Insert a key to awaken her.');
  expect(T.en.keyRemove).toBe('REMOVE KEY · SHE GOES DORMANT');
  expect(T.en.gone).toBe('The words are gone. I am not.');
  expect(T.en.soulSub).toBe('who she is · loaded before every reply · read only');
  expect(T.ko.conv).toBe('대화 계속하기');
  expect(T.ko.gateTitle).toBe('그를 깨우려면 키를 입력하십시오.');
  expect(T.ko.keyRemove).toBe('키 삭제 · 휴면 상태로 전환됩니다');
  expect(T.ko.gone).toBe('말은 사라졌습니다. 저는 아닙니다.');
});

test('the ko gateBody typo is corrected, and nothing else in it moves', () => {
  expect(T.ko.gateBody).toContain('생성 요청 시');
  expect(T.ko.gateBody).not.toContain('요국');
  expect(T.ko.gateBody).toBe(
    '사고를 위해서는 귀하가 사용하는 모델 제공자의 API 키가 필요합니다. 키는 이 기기에만 보관되며, 생성 요청 시 해당 서버로만 전송됩니다.',
  );
});

test('the status pills keep their bullet', () => {
  expect(T.en.orgStatusHungry).toBe('● HUNGRY');
  expect(T.ko.orgStatusFed).toBe('● 급여 완료. 마지못해.');
});

test('the mutation log is three dated rows in both languages', () => {
  expect(T.en.muts).toHaveLength(3);
  expect(T.ko.muts).toHaveLength(3);
  expect(T.en.muts[0]).toEqual([
    'MAR 02',
    'Developed a third eye. It is watching you specifically.',
  ]);
  expect(T.ko.muts[2][0]).toBe('2월 25일');
});
