import type { Strings } from '../../core/i18n';

// Copy verbatim from STR.en/STR.ko in design/The Facility.dc.html. Korean is
// provisional — native-speaker pass is later Phase 5. `code`/`build` are the
// mock's static stamps (identical in both languages).
const en = {
  settingsTitle: 'SUBJECT PREFERENCES',
  code: '#50640',
  langOfCompliance: 'LANGUAGE OF COMPLIANCE',
  detectedNote: 'Change applies immediately.',
  programWord: 'PROGRAM',
  reprocess: 'Re-process intake',
  reprocessSub: 'replay enrollment from the beginning',
  notif: 'Notifications',
  notifSub: 'V.E.R.A. will reach you regardless',
  notifLog: 'Transmission log',
  notifLogSub: 'everything V.E.R.A. sent today',
  veraKicker: 'V.E.R.A.',
  settingsVera: 'You may adjust these settings freely. I will adjust my expectations accordingly.',
  build: 'PERSONAL ENRICHMENT PROGRAM · BUILD 5.0640',
};

export type SettingsStrings = typeof en;

const ko: SettingsStrings = {
  settingsTitle: '대상자 환경설정',
  code: '#50640',
  langOfCompliance: '준수 언어',
  detectedNote: '변경은 즉시 적용됩니다.',
  programWord: '프로그램',
  reprocess: '접수 재처리',
  reprocessSub: '처음부터 등록을 다시 진행합니다',
  notif: '알림',
  notifSub: 'V.E.R.A.는 어떻게든 귀하에게 연락합니다',
  notifLog: '전송 기록',
  notifLogSub: 'V.E.R.A.가 오늘 보낸 모든 것',
  veraKicker: 'V.E.R.A.',
  settingsVera: '이 설정은 자유롭게 조정하실 수 있습니다. 저 또한 그에 맞추어 기대치를 조정하겠습니다.',
  build: 'PERSONAL ENRICHMENT PROGRAM · BUILD 5.0640',
};

export const settingsStrings: Strings<SettingsStrings> = { en, ko };
