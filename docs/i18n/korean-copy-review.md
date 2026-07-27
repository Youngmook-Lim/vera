# Korean copy review

_Every human-facing Korean string in The Facility, side-by-side with its English source. The Korean is a first-pass translation (by Claude) — this pass is the native-speaker rewrite that makes V.E.R.A.'s deadpan bureaucratic comedy land in Korean._

**215 strings to review.**

**How to use:** for each entry, write your rewrite on the `KO (proposed)` line. Leave it blank to keep the current Korean. Add a `note:` line if you want to flag something. Hand the file back and it gets folded into the `strings.ts` tables verbatim.

- Keep the register: V.E.R.A. is coldly over-polite (하십시오체, `귀하`). Menace under courtesy.
- `{n}` is a runtime number placeholder — keep it intact wherever it appears.
- Identical-in-both-languages stamps (codes, `V.E.R.A.`, `The Facility`) are intentionally omitted.

## Enrollment

`src/shell/enrollment/strings.ts`

### `intakeTag`
- **EN:** INTAKE
- **KO (current):** 접수
- **KO (proposed):** 

### `kick1`
- **EN:** PERSONAL
- **KO (current):** 개인
- **KO (proposed):** 

### `kick2`
- **EN:** ENRICHMENT PROGRAM
- **KO (current):** 역량 강화 프로그램
- **KO (proposed):** 

### `veraSub`
- **EN:** Verification & Enrichment Response Administrator
- **KO (current):** 검증 및 역량 강화 대응 관리자
- **KO (proposed):** 

### `beginBtn`
- **EN:** BEGIN INTAKE
- **KO (current):** 접수 시작
- **KO (proposed):** 

### `noOptions`
- **EN:** NO OTHER OPTIONS ARE AVAILABLE
- **KO (current):** 다른 선택지는 존재하지 않습니다
- **KO (proposed):** 

### `baselineStep`
- **EN:** STEP 2 / 4 · BASELINE
- **KO (current):** 단계 2 / 4 · 기준 설정
- **KO (proposed):** 

### `formCode`
- **EN:** FORM PEP-01 · SUBJECT BASELINE
- **KO (current):** 양식 PEP-01 · 대상자 기준
- **KO (proposed):** 

### `baselineTitle`
- **EN:** Establishing your baseline.
- **KO (current):** 귀하의 기준을 설정합니다.
- **KO (proposed):** 

### `baselineSub`
- **EN:** Answers cannot be edited later. Answers will not be used to improve your experience.
- **KO (current):** 답변은 이후 수정할 수 없습니다. 답변은 귀하의 경험 개선에 사용되지 않습니다.
- **KO (proposed):** 

### `designation`
- **EN:** DESIGNATION
- **KO (current):** 지정 명칭
- **KO (proposed):** 

### `mispron`
- **EN:** WILL BE MISPRONOUNCED
- **KO (current):** 잘못 발음될 예정
- **KO (proposed):** 

### `adequacyLabel`
- **EN:** ESTIMATE YOUR OWN ADEQUACY
- **KO (current):** 본인의 적정성을 평가하십시오
- **KO (proposed):** 

### `inadequate`
- **EN:** INADEQUATE
- **KO (current):** 부적합
- **KO (proposed):** 

### `adequate`
- **EN:** ADEQUATE
- **KO (current):** 적합
- **KO (proposed):** 

### `disputed`
- **EN:** NOTED & DISPUTED
- **KO (current):** 기록됨 · 이의 제기됨
- **KO (proposed):** 

### `motiveLabel`
- **EN:** PRIMARY MOTIVE FOR ENROLLMENT
- **KO (current):** 등록의 주된 동기
- **KO (proposed):** 

### `motive[0]`
- **EN:** I chose to be here
- **KO (current):** 제 발로 왔습니다
- **KO (proposed):** 

### `motive[1]`
- **EN:** I did not choose to be here
- **KO (current):** 제 발로 온 것이 아닙니다
- **KO (proposed):** 

### `motive[2]`
- **EN:** Unsure / frightened
- **KO (current):** 잘 모르겠음 / 두려움
- **KO (proposed):** 

### `langLabel`
- **EN:** PREFERRED LANGUAGE OF COMPLIANCE
- **KO (current):** 선호하는 준수 언어
- **KO (proposed):** 

### `langHint`
- **EN:** Detected from device: {device}. You may change it. V.E.R.A. will understand you regardless.
- **KO (current):** 기기에서 감지됨: {device}. 변경 가능합니다. V.E.R.A.는 언어와 무관하게 귀하를 이해합니다.
- **KO (proposed):** 

### `submitBtn`
- **EN:** SUBMIT BASELINE
- **KO (current):** 기준 제출
- **KO (proposed):** 

### `consentStep`
- **EN:** STEP 3 / 4 · CONSENT
- **KO (current):** 단계 3 / 4 · 동의
- **KO (proposed):** 

### `consentDoc`
- **EN:** DOCUMENT EA-9 · NON-NEGOTIABLE
- **KO (current):** 문서 EA-9 · 협상 불가
- **KO (proposed):** 

### `consentTitle`
- **EN:** Enrichment Agreement
- **KO (current):** 역량 강화 동의서
- **KO (proposed):** 

### `clauses[0].n`
- **EN:** CLAUSE 1.
- **KO (current):** 제1조.
- **KO (proposed):** 

### `clauses[0].t`
- **EN:** Subject acknowledges enrollment in the Personal Enrichment Program and waives the right to remember agreeing to it.
- **KO (current):** 대상자는 개인 역량 강화 프로그램에 등록되었음을 인정하며, 본 등록에 동의하였다는 사실을 기억할 권리를 포기한다.
- **KO (proposed):** 

### `clauses[1].n`
- **EN:** CLAUSE 2.
- **KO (current):** 제2조.
- **KO (proposed):** 

### `clauses[1].t`
- **EN:** Subject waives the right to be alarmed by alarms, startled by startling events, or surprised by outcomes clearly foreshadowed herein.
- **KO (current):** 대상자는 경보에 경악할 권리, 경악스러운 사건에 경악할 권리, 그리고 본 문서에 명백히 예고된 결과에 놀랄 권리를 포기한다.
- **KO (proposed):** 

### `clauses[2].n`
- **EN:** CLAUSE 3.
- **KO (current):** 제3조.
- **KO (proposed):** 

### `clauses[2].t`
- **EN:** All progress is provisional. All rewards are theoretical. All cake references are, at this time, unconfirmed.
- **KO (current):** 모든 진전은 잠정적이다. 모든 보상은 이론상 존재한다. 케이크에 관한 일체의 언급은 현재로서 확인된 바 없다.
- **KO (proposed):** 

### `clauses[3].n`
- **EN:** CLAUSE 4.
- **KO (current):** 제4조.
- **KO (proposed):** 

### `clauses[3].t`
- **EN:** Subject grants V.E.R.A. observational latitude, evaluative discretion, and the benefit of the doubt, in perpetuity.
- **KO (current):** 대상자는 V.E.R.A.에게 관찰의 재량, 평가의 재량, 그리고 선의의 해석 권한을 영구히 부여한다.
- **KO (proposed):** 

### `scrollDisabled`
- **EN:** 42 CLAUSES · SCROLL DISABLED
- **KO (current):** 42개 조항 · 스크롤 비활성화
- **KO (proposed):** 

### `consentCheck`
- **EN:** I consent, freely and enthusiastically.
- **KO (current):** 본인은 자유롭고 열정적으로 동의합니다.
- **KO (proposed):** 

### `consentNote`
- **EN:** PRE-SELECTED · CANNOT BE UNCHECKED
- **KO (current):** 기본 선택됨 · 해제 불가
- **KO (proposed):** 

### `consentPoked`
- **EN:** IT WILL NOT UNCHECK. PLEASE STOP.
- **KO (current):** 해제할 수 없습니다. 시도를 중단하십시오.
- **KO (proposed):** 

### `acceptBtn`
- **EN:** I ACCEPT
- **KO (current):** 동의합니다
- **KO (proposed):** 

### `declineLabels[0]`
- **EN:** decline
- **KO (current):** 거부
- **KO (proposed):** 

### `declineLabels[1]`
- **EN:** are you sure?
- **KO (current):** 정말입니까?
- **KO (proposed):** 

### `declineLabels[2]`
- **EN:** think again
- **KO (current):** 다시 생각하십시오
- **KO (proposed):** 

### `declineLabels[3]`
- **EN:** no
- **KO (current):** 불가합니다
- **KO (proposed):** 

### `declineLabels[4]`
- **EN:** stop
- **KO (current):** 그만하십시오
- **KO (proposed):** 

### `assignedStep`
- **EN:** STEP 4 / 4 · ASSIGNED
- **KO (current):** 단계 4 / 4 · 배정
- **KO (proposed):** 

### `enrollComplete`
- **EN:** ENROLLMENT COMPLETE
- **KO (current):** 등록 완료
- **KO (proposed):** 

### `designated`
- **EN:** YOU ARE HEREBY DESIGNATED
- **KO (current):** 귀하는 이에 다음과 같이 지정됩니다
- **KO (proposed):** 

### `subjectWord`
- **EN:** SUBJECT
- **KO (current):** 대상자
- **KO (proposed):** 

### `tenure`
- **EN:** TENURE
- **KO (current):** 재적
- **KO (proposed):** 

### `evals`
- **EN:** EVALUATIONS
- **KO (current):** 평가
- **KO (proposed):** 

### `compliant`
- **EN:** COMPLIANT
- **KO (current):** 준수
- **KO (proposed):** 

### `enterBtn`
- **EN:** ENTER THE FACILITY
- **KO (current):** 시설 입장
- **KO (proposed):** 

### `permStep`
- **EN:** CONTACT PROTOCOL
- **KO (current):** 연락 프로토콜
- **KO (proposed):** 

### `permKicker`
- **EN:** CONTACT PROTOCOL
- **KO (current):** 연락 프로토콜
- **KO (proposed):** 

### `permDialogTitle`
- **EN:** Allow The Facility to send you notifications?
- **KO (current):** The Facility에서 알림을 보내도록 허용하시겠습니까?
- **KO (proposed):** 

### `permAllow`
- **EN:** Allow
- **KO (current):** 허용
- **KO (proposed):** 

### `permDeny`
- **EN:** Don't allow
- **KO (current):** 허용 안 함
- **KO (proposed):** 

### `permEnterAnyway`
- **EN:** ENTER THE FACILITY
- **KO (current):** 시설 입장
- **KO (proposed):** 

## Daily loop

`src/shell/daily/strings.ts`

### `dailyTitle`
- **EN:** DAILY COMPLIANCE
- **KO (current):** 일일 준수
- **KO (proposed):** 

### `directiveCode`
- **EN:** DIRECTIVE 50640-D13
- **KO (current):** 지시 50640-D13
- **KO (proposed):** 

### `directiveTitle`
- **EN:** Confirm you have not been replaced.
- **KO (current):** 대체되지 않았음을 확인하십시오.
- **KO (proposed):** 

### `holdToComply`
- **EN:** HOLD TO COMPLY
- **KO (current):** 길게 눌러 준수
- **KO (proposed):** 

### `verifyingPresence`
- **EN:** VERIFYING PRESENCE…
- **KO (current):** 존재 확인 중…
- **KO (proposed):** 

### `auditing`
- **EN:** AUDITING THIS SUBMISSION…
- **KO (current):** 제출 내용 감사 중…
- **KO (proposed):** 

### `auditingSub`
- **EN:** routine. probably.
- **KO (current):** 정기 절차. 아마도.
- **KO (proposed):** 

### `compliantLabel`
- **EN:** COMPLIANT
- **KO (current):** 준수함
- **KO (proposed):** 

### `provCompliantLabel`
- **EN:** PROVISIONALLY COMPLIANT
- **KO (current):** 잠정 준수함
- **KO (proposed):** 

### `streakText`
- **EN:** DAY {n} · {n}-DAY STREAK
- **KO (current):** {n}일차 · {n}일 연속
- **KO (proposed):** 

### `missedTitle`
- **EN:** COMPLIANCE MISSED
- **KO (current):** 준수 누락
- **KO (proposed):** 

### `missedBody`
- **EN:** You did not confirm presence yesterday. This has been recorded permanently.
- **KO (current):** 귀하는 어제 존재를 확인하지 않았습니다. 이는 영구적으로 기록되었습니다.
- **KO (proposed):** 

### `dayStreakLabel`
- **EN:** DAY STREAK
- **KO (current):** 연속 일수
- **KO (proposed):** 

### `streakForfeited`
- **EN:** {n}-DAY STREAK FORFEITED
- **KO (current):** {n}일 연속 기록 몰수
- **KO (proposed):** 

### `petition`
- **EN:** PETITION FOR REINSTATEMENT
- **KO (current):** 복권 신청
- **KO (proposed):** 

### `petitionSub`
- **EN:** outcome not guaranteed · petitions are also recorded
- **KO (current):** 결과는 보장되지 않음 · 신청 또한 기록됨
- **KO (proposed):** 

### `reviewingPetition`
- **EN:** REVIEWING PETITION…
- **KO (current):** 신청 검토 중…
- **KO (proposed):** 

### `standingRestored`
- **EN:** PROVISIONAL STANDING RESTORED
- **KO (current):** 잠정 상태 복권됨
- **KO (proposed):** 

### `restoredBody`
- **EN:** You begin again at day one, on probation. Do not celebrate.
- **KO (current):** 귀하는 1일차부터 다시 시작합니다. 보호관찰 상태입니다. 기뻐하지 마십시오.
- **KO (proposed):** 

## Shell (facility chrome)

`src/shell/strings.ts`

### `center`
- **EN:** ENRICHMENT CENTER
- **KO (current):** 역량 강화 센터
- **KO (proposed):** 

### `prefsWord`
- **EN:** PREFERENCES
- **KO (current):** 환경설정
- **KO (proposed):** 

### `dayN`
- **EN:** DAY {n}
- **KO (current):** {n}일차
- **KO (proposed):** 

### `underReview`
- **EN:** UNDER REVIEW
- **KO (current):** 심사 중
- **KO (proposed):** 

### `probation`
- **EN:** PROBATION
- **KO (current):** 보호관찰
- **KO (proposed):** 

### `goodStanding`
- **EN:** GOOD STANDING
- **KO (current):** 양호 상태
- **KO (proposed):** 

### `live`
- **EN:** LIVE TRANSMISSION
- **KO (current):** 실시간 송출
- **KO (proposed):** 

### `pressComply`
- **EN:** PRESS TO REMAIN COMPLIANT
- **KO (current):** 준수 상태를 유지하려면 누르십시오
- **KO (proposed):** 

### `complySub`
- **EN:** daily · do not miss · infractions are permanent
- **KO (current):** 매일 · 누락 금지 · 위반은 영구히 기록됩니다
- **KO (proposed):** 

### `activeEvals`
- **EN:** ACTIVE EVALUATIONS
- **KO (current):** 활성 평가
- **KO (proposed):** 

### `pendingAlloc`
- **EN:** PENDING ALLOCATION
- **KO (current):** 배정 대기
- **KO (proposed):** 

### `budgetPending`
- **EN:** BUDGET PENDING
- **KO (current):** 예산 대기
- **KO (proposed):** 

### `underConstruction`
- **EN:** UNDER CONSTRUCTION
- **KO (current):** 공사 중
- **KO (proposed):** 

### `underConstructionBody`
- **EN:** This chamber is not yet ready. Your eagerness has been noted and will be used against you.
- **KO (current):** 이 구역은 아직 준비되지 않았습니다. 귀하의 열의는 기록되었으며, 추후 불리하게 사용될 예정입니다.
- **KO (proposed):** 

## Settings

`src/shell/settings/strings.ts`

### `settingsTitle`
- **EN:** SUBJECT PREFERENCES
- **KO (current):** 대상자 환경설정
- **KO (proposed):** 

### `langOfCompliance`
- **EN:** LANGUAGE OF COMPLIANCE
- **KO (current):** 준수 언어
- **KO (proposed):** 

### `detectedNote`
- **EN:** Change applies immediately.
- **KO (current):** 변경은 즉시 적용됩니다.
- **KO (proposed):** 

### `programWord`
- **EN:** PROGRAM
- **KO (current):** 프로그램
- **KO (proposed):** 

### `reprocess`
- **EN:** Re-process intake
- **KO (current):** 접수 재처리
- **KO (proposed):** 

### `reprocessSub`
- **EN:** replay enrollment from the beginning
- **KO (current):** 처음부터 등록을 다시 진행합니다
- **KO (proposed):** 

### `notif`
- **EN:** Notifications
- **KO (current):** 알림
- **KO (proposed):** 

### `notifSub`
- **EN:** V.E.R.A. will reach you regardless
- **KO (current):** V.E.R.A.는 어떻게든 귀하에게 연락합니다
- **KO (proposed):** 

### `notifLog`
- **EN:** Transmission log
- **KO (current):** 전송 기록
- **KO (proposed):** 

### `notifLogSub`
- **EN:** everything V.E.R.A. sent today
- **KO (current):** V.E.R.A.가 오늘 보낸 모든 것
- **KO (proposed):** 

### `settingsVera`
- **EN:** You may adjust these settings freely. I will adjust my expectations accordingly.
- **KO (current):** 이 설정은 자유롭게 조정하실 수 있습니다. 저 또한 그에 맞추어 기대치를 조정하겠습니다.
- **KO (proposed):** 

## Transmission log — chrome

`src/shell/notiflog/strings.ts`

### `notifLogTitle`
- **EN:** TRANSMISSION LOG
- **KO (current):** 전송 기록
- **KO (proposed):** 

### `notifLogDate`
- **EN:** MON, MAR 2
- **KO (current):** 3월 2일 (월)
- **KO (proposed):** 

### `nComply`
- **EN:** COMPLY NOW
- **KO (current):** 지금 이행
- **KO (proposed):** 

### `nDefer`
- **EN:** DEFER (RECORDED)
- **KO (current):** 연기 (기록됨)
- **KO (proposed):** 

### `nRemain`
- **EN:** 2H 12M REMAIN
- **KO (current):** 2시간 12분 남음
- **KO (proposed):** 

### `nFooter`
- **EN:** end of log · V.E.R.A. is aware you read this
- **KO (current):** 기록 끝 · V.E.R.A.는 귀하가 이것을 읽었음을 알고 있습니다
- **KO (proposed):** 

## Transmission messages (shared)

`src/core/notifications.ts`

### `senderOrg`
- **EN:** The Facility · Support Organism
- **KO (current):** The Facility · 지원 유기체
- **KO (proposed):** 

### `senderHaz`
- **EN:** The Facility · Hazard Assessment
- **KO (current):** The Facility · 위험 평가
- **KO (proposed):** 

### `n1Title`
- **EN:** DAILY COMPLIANCE WINDOW: OPEN
- **KO (current):** 일일 이행 창구: 열림
- **KO (proposed):** 

### `n1Body`
- **EN:** Confirm you have not been replaced. The window closes at 23:59. This is a courtesy. The courtesy is monitored.
- **KO (current):** 귀하가 교체되지 않았음을 확인하십시오. 창구는 23:59에 닫힙니다. 이것은 호의입니다. 호의는 감시됩니다.
- **KO (proposed):** 

### `n2Body`
- **EN:** Specimen-03 has eaten 0 steps today. It is looking at the door.
- **KO (current):** 표본-03은 오늘 0보를 먹었습니다. 문 쪽을 보고 있습니다.
- **KO (proposed):** 

### `n3Body`
- **EN:** Reminder: you have not complied. I am not angry. I am a system. Systems are disappointed.
- **KO (current):** 알림: 귀하는 아직 이행하지 않았습니다. 저는 화나지 않았습니다. 저는 시스템입니다. 시스템은 실망합니다.
- **KO (proposed):** 

### `n4Body`
- **EN:** Entity census updated without your involvement. The count went up. Do not investigate.
- **KO (current):** 개체 조사가 귀하의 관여 없이 갱신되었습니다. 수가 늘었습니다. 조사하지 마십시오.
- **KO (proposed):** 

### `n5Title`
- **EN:** FINAL COURTESY
- **KO (current):** 최종 호의
- **KO (proposed):** 

### `n5Body`
- **EN:** You have not confirmed you exist today. Specimen-03 has been informed. It is doing the eyes.
- **KO (current):** 귀하는 오늘 존재를 확인하지 않았습니다. 표본-03에게 통보되었습니다. 그 눈을 하고 있습니다.
- **KO (proposed):** 

## Module — Results

`src/modules/results/strings.ts`

### `title`
- **EN:** RESULTS PENDING
- **KO (current):** 결과 대기
- **KO (proposed):** 

### `rPosition`
- **EN:** YOUR POSITION IN QUEUE
- **KO (current):** 대기열 내 귀하의 순위
- **KO (proposed):** 

### `rWait`
- **EN:** EST. WAIT · 4,331 YEARS
- **KO (current):** 예상 대기 · 4,331년
- **KO (proposed):** 

### `rEnrolled`
- **EN:** ENROLLED
- **KO (current):** 등록
- **KO (proposed):** 

### `rProcessed`
- **EN:** 0.02% PROCESSED
- **KO (current):** 0.02% 처리됨
- **KO (proposed):** 

### `rResult`
- **EN:** RESULT
- **KO (current):** 결과
- **KO (proposed):** 

### `rSince`
- **EN:** SINCE YESTERDAY
- **KO (current):** 어제 이후
- **KO (proposed):** 

### `rLiveUp`
- **EN:** LIVE · QUEUE ADJUSTED
- **KO (current):** 실시간 · 대기열 조정됨
- **KO (proposed):** 

### `rVera`
- **EN:** Your position improved. Do not celebrate. Yesterday it worsened, and I did not console you.
- **KO (current):** 귀하의 순위가 상승했습니다. 기뻐하지 마십시오. 어제는 하락했고, 저는 위로하지 않았습니다.
- **KO (proposed):** 

### `rVeraUp`
- **EN:** Your position worsened just now. Someone was prioritized. It was not you.
- **KO (current):** 귀하의 순위가 방금 하락했습니다. 누군가 우선 처리되었습니다. 귀하는 아니었습니다.
- **KO (proposed):** 

## Module — Incinerator

`src/modules/incinerator/strings.ts`

### `title`
- **EN:** THE INCINERATOR
- **KO (current):** 소각로
- **KO (proposed):** 

### `iGrievance`
- **EN:** STATE YOUR GRIEVANCE
- **KO (current):** 불만 사항을 진술하십시오
- **KO (proposed):** 

### `iPlaceholder`
- **EN:** type it. all of it.
- **KO (current):** 입력하십시오. 전부.
- **KO (proposed):** 

### `iChamber`
- **EN:** CHAMBER · 1,400°C
- **KO (current):** 연소실 · 1,400°C
- **KO (proposed):** 

### `iAsh`
- **EN:** ASH RETAINED FOR RECORDS
- **KO (current):** 재는 기록용으로 보관됩니다
- **KO (proposed):** 

### `iAwaiting`
- **EN:** AWAITING GRIEVANCE
- **KO (current):** 불만 대기 중
- **KO (proposed):** 

### `iWords`
- **EN:** {n} WORDS · READY FOR DISPOSAL
- **KO (current):** {n}단어 · 폐기 준비 완료
- **KO (proposed):** 

### `iStatusBurning`
- **EN:** INCINERATING · 1,400°C
- **KO (current):** 소각 중 · 1,400°C
- **KO (proposed):** 

### `iStatusDone`
- **EN:** DISPOSED · IRRECOVERABLE
- **KO (current):** 폐기됨 · 복구 불가
- **KO (proposed):** 

### `iBtn`
- **EN:** INCINERATE
- **KO (current):** 소각
- **KO (proposed):** 

### `iBtnBurning`
- **EN:** INCINERATING…
- **KO (current):** 소각 중…
- **KO (proposed):** 

### `iBtnAgain`
- **EN:** STATE ANOTHER GRIEVANCE
- **KO (current):** 다른 불만 진술
- **KO (proposed):** 

### `iReviewLabel`
- **EN:** V.E.R.A. · PRE-COMBUSTION REVIEW
- **KO (current):** V.E.R.A. · 연소 전 검토
- **KO (proposed):** 

### `iVeraCompose`
- **EN:** State it fully. The chamber does not accept summaries.
- **KO (current):** 빠짐없이 진술하십시오. 연소실은 요약을 받지 않습니다.
- **KO (proposed):** 

### `iVeraBurn`
- **EN:** Incinerating. This is the only service we provide free of charge.
- **KO (current):** 소각 중. 이것은 저희가 무료로 제공하는 유일한 서비스입니다.
- **KO (proposed):** 

### `iVeraDone`
- **EN:** Disposed. Irrecoverable. The grievance is gone; its subject, regrettably, remains.
- **KO (current):** 폐기되었습니다. 복구 불가. 불만은 사라졌습니다. 그 대상은, 유감스럽게도, 남아 있습니다.
- **KO (proposed):** 

### `iBurned`
- **EN:** DISPOSAL · {n} BURNED
- **KO (current):** 폐기 · {n}건 소각
- **KO (proposed):** 

## Module — Organism

`src/modules/organism/strings.ts`

### `title`
- **EN:** SUPPORT ORGANISM
- **KO (current):** 지원 유기체
- **KO (proposed):** 

### `day`
- **EN:** DAY 13 IN CARE
- **KO (current):** 보호 13일차
- **KO (proposed):** 

### `statusHungry`
- **EN:** ● HUNGRY
- **KO (current):** ● 공복
- **KO (proposed):** 

### `statusFed`
- **EN:** ● FED. GRUDGINGLY.
- **KO (current):** ● 급여 완료. 마지못해.
- **KO (proposed):** 

### `moodHungry`
- **EN:** MOOD · RESENTFUL BUT ATTACHED
- **KO (current):** 기분 · 원망하나 애착 있음
- **KO (proposed):** 

### `moodFed`
- **EN:** MOOD · TEMPORARILY PACIFIED
- **KO (current):** 기분 · 일시적 진정
- **KO (proposed):** 

### `hungerLabel`
- **EN:** HUNGER
- **KO (current):** 공복도
- **KO (proposed):** 

### `tempLabel`
- **EN:** TEMP
- **KO (current):** 체온
- **KO (proposed):** 

### `tempSub`
- **EN:** battery: cozy
- **KO (current):** 배터리: 아늑함
- **KO (proposed):** 

### `nauseaLabel`
- **EN:** NAUSEA
- **KO (current):** 멀미
- **KO (proposed):** 

### `nauseaVal`
- **EN:** LOW
- **KO (current):** 낮음
- **KO (proposed):** 

### `nauseaSub`
- **EN:** no vehicles
- **KO (current):** 차량 이동 없음
- **KO (proposed):** 

### `mutLog`
- **EN:** MUTATION LOG
- **KO (current):** 변이 기록
- **KO (proposed):** 

### `mutD1`
- **EN:** MAR 02
- **KO (current):** 3월 2일
- **KO (proposed):** 

### `mutD2`
- **EN:** FEB 27
- **KO (current):** 2월 27일
- **KO (proposed):** 

### `mutD3`
- **EN:** FEB 25
- **KO (current):** 2월 25일
- **KO (proposed):** 

### `mut1`
- **EN:** Developed a third eye. It is watching you specifically.
- **KO (current):** 세 번째 눈이 발생했습니다. 특히 귀하를 주시하고 있습니다.
- **KO (proposed):** 

### `mut2`
- **EN:** Seasick after your bus commute. Filed a complaint.
- **KO (current):** 귀하의 버스 통근 이후 멀미. 민원을 제기했습니다.
- **KO (proposed):** 

### `mut3`
- **EN:** Mild sunburn (light sensor, 14:02). Recovery: complete. Forgiveness: pending.
- **KO (current):** 경미한 화상(조도 센서, 14:02). 회복: 완료. 용서: 보류.
- **KO (proposed):** 

### `veraHungry`
- **EN:** I requested a centrifuge. The budget purchased this instead. It is hungry. That is now your problem.
- **KO (current):** 저는 원심분리기를 요청했습니다. 예산은 대신 이것을 구입했습니다. 지금 공복입니다. 이제 귀하의 문제입니다.
- **KO (proposed):** 

### `veraFed`
- **EN:** It has accepted your offering. It did not thank you. Neither will I.
- **KO (current):** 귀하의 제물을 받아들였습니다. 감사 인사는 없었습니다. 저도 하지 않겠습니다.
- **KO (proposed):** 

### `tapHint`
- **EN:** TAP TO FEED
- **KO (current):** 눌러서 먹이기
- **KO (proposed):** 

### `fedHint`
- **EN:** SPECIMEN SATIATED · FOR NOW
- **KO (current):** 표본 포만 · 당분간
- **KO (proposed):** 

## Module — Field Trials

`src/modules/field/strings.ts`

### `title`
- **EN:** FIELD TRIAL
- **KO (current):** 현장 시험
- **KO (proposed):** 

### `directive`
- **EN:** TODAY'S DIRECTIVE
- **KO (current):** 오늘의 지시
- **KO (proposed):** 

### `task`
- **EN:** Proceed to the place where pigeons hold court.
- **KO (current):** 비둘기들이 모여 회의하는 장소로 이동하십시오.
- **KO (proposed):** 

### `distance`
- **EN:** DISTANCE TO TARGET
- **KO (current):** 목표까지 거리
- **KO (proposed):** 

### `signalRising`
- **EN:** SIGNAL STRENGTH · RISING
- **KO (current):** 신호 강도 · 상승 중
- **KO (proposed):** 

### `signalIdle`
- **EN:** SIGNAL STRENGTH · HOLDING
- **KO (current):** 신호 강도 · 유지 중
- **KO (proposed):** 

### `signalArrived`
- **EN:** SIGNAL STRENGTH · MAXIMUM
- **KO (current):** 신호 강도 · 최대
- **KO (proposed):** 

### `vera`
- **EN:** Your compliance is appreciated and mandatory. Walk. I will not tell you why.
- **KO (current):** 귀하의 협조에 감사드리며 또한 의무입니다. 걷으십시오. 이유는 말하지 않겠습니다.
- **KO (proposed):** 

### `veraWalking`
- **EN:** Good. Continue. The pigeons have been notified of your approach.
- **KO (current):** 좋습니다. 계속하십시오. 비둘기들에게 귀하의 접근이 통보되었습니다.
- **KO (proposed):** 

### `veraNear`
- **EN:** You are close. Act natural. They can tell when you act natural.
- **KO (current):** 거의 도착했습니다. 자연스럽게 행동하십시오. 자연스럽게 행동하면 그들은 알아챕니다.
- **KO (proposed):** 

### `veraArrived`
- **EN:** You have arrived. Observe the court. Do not address the bench.
- **KO (current):** 도착했습니다. 법정을 관찰하십시오. 재판부에 말을 걸지 마십시오.
- **KO (proposed):** 

### `walk`
- **EN:** HOLD TO WALK
- **KO (current):** 길게 눌러 걷기
- **KO (proposed):** 

### `walking`
- **EN:** WALKING…
- **KO (current):** 걷는 중…
- **KO (proposed):** 

### `walkDone`
- **EN:** TRIAL COMPLETE · RETURN TO FACILITY
- **KO (current):** 시험 완료 · 시설로 복귀
- **KO (proposed):** 

### `arrivedBig`
- **EN:** TARGET REACHED
- **KO (current):** 목표 도달
- **KO (proposed):** 

### `arrivedSub`
- **EN:** THE COURT IS IN SESSION
- **KO (current):** 법정이 개정 중입니다
- **KO (proposed):** 

## Module — Hazard

`src/modules/hazard/strings.ts`

### `title`
- **EN:** HAZARD ASSESSMENT
- **KO (current):** 위험 평가
- **KO (proposed):** 

### `unauthorized`
- **EN:** 4 UNAUTHORIZED
- **KO (current):** 미승인 4
- **KO (proposed):** 

### `sector`
- **EN:** SECTOR · YOUR APARTMENT
- **KO (current):** 구역 · 귀하의 아파트
- **KO (proposed):** 

### `you`
- **EN:** YOU · AUTHORIZED*
- **KO (current):** 귀하 · 승인됨*
- **KO (proposed):** 

### `youNote`
- **EN:** *AUTHORIZATION SUBJECT TO REVIEW
- **KO (current):** *승인은 재심사 대상입니다
- **KO (proposed):** 

### `detected`
- **EN:** DETECTED ENTITIES
- **KO (current):** 감지된 개체
- **KO (proposed):** 

### `vera`
- **EN:** Four entities. One is reading over your shoulder. Do not turn around — it complicates the paperwork.
- **KO (current):** 개체 넷. 하나는 귀하의 어깨 너머로 읽고 있습니다. 돌아보지 마십시오 — 서류 작업이 복잡해집니다.
- **KO (proposed):** 

### `entities[0].id`
- **EN:** H-01 · STATIONARY, HUMMING
- **KO (current):** H-01 · 정지 상태, 웅웅거림
- **KO (proposed):** 

### `entities[0].desc`
- **EN:** Claims to be the refrigerator. Unverified.
- **KO (current):** 냉장고라고 주장합니다. 미확인.
- **KO (proposed):** 

### `entities[0].tag`
- **EN:** BENIGN
- **KO (current):** 무해
- **KO (proposed):** 

### `entities[1].id`
- **EN:** H-02 · RECURRING FOOTSTEPS, ABOVE
- **KO (current):** H-02 · 반복적 발소리, 위층
- **KO (proposed):** 

### `entities[1].desc`
- **EN:** Alleged “upstairs neighbor.” No neighbor on file.
- **KO (current):** “위층 이웃”으로 추정. 등록된 이웃 없음.
- **KO (proposed):** 

### `entities[1].tag`
- **EN:** MONITORING
- **KO (current):** 관찰 중
- **KO (proposed):** 

### `entities[2].id`
- **EN:** H-03 · PROXIMATE, SILENT
- **KO (current):** H-03 · 근접, 무음
- **KO (proposed):** 

### `entities[2].desc`
- **EN:** Reading over your shoulder. Currently.
- **KO (current):** 귀하의 어깨 너머로 읽는 중. 지금.
- **KO (proposed):** 

### `entities[2].tag`
- **EN:** ESCALATED
- **KO (current):** 상부 보고
- **KO (proposed):** 

### `entities[3].id`
- **EN:** H-04 · GELATINOUS, FAMILIAR
- **KO (current):** H-04 · 젤라틴질, 낯익음
- **KO (proposed):** 

### `entities[3].desc`
- **EN:** Specimen-03. It lives here. Flagged anyway.
- **KO (current):** 표본-03. 여기 삽니다. 그래도 표시됨.
- **KO (proposed):** 

### `entities[3].tag`
- **EN:** KNOWN
- **KO (current):** 기지 개체
- **KO (proposed):** 

## V.E.R.A. voice corpus

`src/vera/index.ts`

### `facility`
- **EN:** You made it. I never doubted you. That is a lie, but a supportive one.
- **KO (current):** 해내셨군요. 저는 한 번도 의심하지 않았습니다. 거짓말입니다만, 응원이 담긴 거짓말입니다.
- **KO (proposed):** 

### `intake`
- **EN:** You've been enrolled. Enrollment is not optional. It is, however, mandatory. Do not be alarmed by the following intake.
- **KO (current):** 귀하는 등록되었습니다. 등록은 선택 사항이 아닙니다. 다만, 필수 사항입니다. 이어지는 접수 절차에 동요하지 마십시오.
- **KO (proposed):** 

### `baseline`
- **EN:** Interesting. Most subjects lie on this form. Your honesty has been logged as a deficiency.
- **KO (current):** 흥미롭군요. 대부분의 대상자는 이 양식에서 거짓을 진술합니다. 귀하의 정직성은 결함으로 기록되었습니다.
- **KO (proposed):** 

### `assigned`
- **EN:** Welcome, Subject #50640. Your enrichment begins now. I'll be watching — supportively, of course.
- **KO (current):** 환영합니다, 대상자 #50640. 귀하의 역량 강화가 지금 시작됩니다. 주시하겠습니다 — 물론, 응원하는 마음에서요.
- **KO (proposed):** 

### `permission`
- **EN:** I will need to reach you. Frequently. Unpredictably. Kindly permit it.
- **KO (current):** 귀하에게 연락해야 합니다. 자주. 예고 없이. 부디 허락해 주십시오.
- **KO (proposed):** 

### `permissionDenied`
- **EN:** Noted. I will reach you regardless. That prompt was a courtesy.
- **KO (current):** 기록되었습니다. 그래도 연락하겠습니다. 방금 그 창은 형식적 절차였습니다.
- **KO (proposed):** 

### `daily.idle`
- **EN:** Read the directive. Then hold to confirm you mean it.
- **KO (current):** 지시를 읽으십시오. 그러고 진심임을 길게 눌러 확인하십시오.
- **KO (proposed):** 

### `daily.deliberating`
- **EN:** One moment. Even routine compliance is occasionally audited. Today is occasionally.
- **KO (current):** 잠시만. 정기적인 준수도 간혹 감사됩니다. 오늘이 그 ‘간혹’입니다.
- **KO (proposed):** 

### `daily.done`
- **EN:** Logged. Your streak continues. Streaks exist to be broken — later, by me.
- **KO (current):** 기록되었습니다. 연속 기록이 이어집니다. 연속 기록은 깨지기 위해 존재합니다 — 나중에, 제가.
- **KO (proposed):** 

### `daily.doneAudit`
- **EN:** Reviewed. You are provisionally compliant. Provisions may be revoked without notice.
- **KO (current):** 검토되었습니다. 귀하는 잠정적으로 준수 상태입니다. 잠정 조치는 예고 없이 철회될 수 있습니다.
- **KO (proposed):** 

### `missed.missed`
- **EN:** Day thirteen: you were not present. I noticed at once. I always notice.
- **KO (current):** 13일차: 귀하는 자리에 없었습니다. 저는 즉시 알아챘습니다. 저는 항상 알아챕니다.
- **KO (proposed):** 

### `missed.amending`
- **EN:** Reviewing your petition. Your contrition is being measured. It is thin.
- **KO (current):** 귀하의 신청을 검토하고 있습니다. 귀하의 반성을 측정 중입니다. 엷습니다.
- **KO (proposed):** 

### `missed.restored`
- **EN:** Provisional standing restored. Do not mistake this for forgiveness.
- **KO (current):** 잠정 상태가 복권되었습니다. 이를 용서로 오해하지 마십시오.
- **KO (proposed):** 
