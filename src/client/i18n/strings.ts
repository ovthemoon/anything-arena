import type { Lang } from '../../shared/i18n/lang'

/** 화면 문구 사전. 키는 한 번 정하면 두 언어 모두에 있어야 한다 (tests/client/i18n/strings.test.ts 가 검사). */
export interface Strings {
  appTitle: string
  langToggle: string
  start: { tagline: string; example: string; createRoom: string; soloRoom: string; codePlaceholder: string; join: string; createFailed: string; networkError: string }
  arena: { joinFailedTitle: string; joinFailed: (status: number) => string; joinNetworkError: string; connecting: string; reconnecting: string; sound: string; shake: string; foul: string; foulLock: string }
  lobby: { myWeakPoints: string; weakPoints: string; howToPlay: string; placeholderArt: string; pickingCharacter: string; emptySeat: string; qrAlt: string; joinWithPhone: string; waitingForBoth: string; nicknamePlaceholder: (max: number) => string; nicknameRejected: string; entering: string; enter: string; waitingOpponent: string; ready: string }
  hud: { waiting: string; foulCards: string; weakPoints: string; ready: string; round: (n: number) => string }
  action: { rejectDefault: string; rejectRewrite: string; rejectModeration: string; rejectFoul: string; rejectOutsideCapability: string; rejectSystemInstruction: string; rejectTimeout: string; presetOnly: string; opponentWeakPoints: string; inputLocked: string; inputPlaceholder: string; attack: string; shuffle: string; noIdea: string; validating: string; submitted: string }
  battle: { fight: string; frozen: string }
  outcome: { strong: string; normal: string; limited: string; miss: string }
  result: { bestShot: string; left: string; right: string; win: (name: string) => string; draw: string; waitingOpponent: string; rematch: string; rematchHint: string }
}

const ko: Strings = {
  appTitle: '아무말 대난투',
  langToggle: 'English',
  start: {
    tagline: '무기를 가져오세요. 강한 이유는 저희가 갖다 붙입니다.',
    example: '예: 젖은 양말 vs 배터리 1% 스마트폰',
    createRoom: '방 만들기 (중계 화면)',
    soloRoom: 'AI와 대전',
    codePlaceholder: '방 코드',
    join: '코드로 참가',
    createFailed: '방을 만들지 못했어요. 다시 시도해 주세요.',
    networkError: '네트워크 오류. 연결을 확인해 주세요.',
  },
  arena: {
    joinFailedTitle: '입장 실패',
    joinFailed: (status) => `참가 실패 (${status})`,
    joinNetworkError: '참가 요청 실패 (네트워크)',
    connecting: '연결 중…',
    reconnecting: '다시 연결하는 중…',
    sound: '소리',
    shake: '흔들림',
    foul: '삐익! 인신공격 반칙입니다. 무기로 승부하세요.',
    foulLock: '자유 입력이 잠겼습니다. 이번 경기는 기본 공격으로 진행됩니다.',
  },
  lobby: {
    myWeakPoints: '내 아픈 곳',
    weakPoints: '아픈 곳',
    howToPlay: '라운드마다 한 마디로 상대의 아픈 곳을 긁으세요. 뻔한 칼·주먹은 0점.',
    placeholderArt: '임시 실루엣',
    pickingCharacter: '캐릭터 고르는 중',
    emptySeat: '빈 자리',
    qrAlt: '참가 QR',
    joinWithPhone: '휴대폰으로 참가',
    waitingForBoth: '두 사람이 캐릭터를 고르고 준비하면 시작합니다.',
    nicknamePlaceholder: (max) => `닉네임 (${max}자, 비우면 캐릭터 이름)`,
    nicknameRejected: '닉네임을 확인해 주세요. 사람과 가족은 공격하지 마세요.',
    entering: '입장 중…',
    enter: '이 캐릭터로 입장',
    waitingOpponent: '상대를 기다리는 중…',
    ready: '준비 완료!',
  },
  hud: { waiting: '대기 중', foulCards: '반칙 카드', weakPoints: '아픈 곳', ready: 'READY', round: (n) => `ROUND ${n}` },
  action: {
    rejectDefault: '입력이 거절됐어요. 다시 써주세요.',
    rejectRewrite: '표현을 바꿔주세요. 무기로 승부하세요.',
    rejectModeration: '삐익! 인신공격 반칙입니다. 무기로 승부하세요.',
    rejectFoul: '삐익! 인신공격 반칙입니다. 무기로 승부하세요.',
    rejectOutsideCapability: '이 무기로는 할 수 없는 행동이에요. 다르게 써볼까요?',
    rejectSystemInstruction: '그건 공격이 아니에요. 무기로 승부하세요.',
    rejectTimeout: '연결 지연으로 기본 공격을 사용했습니다.',
    presetOnly: '반칙 2회. 직접 입력은 잠겼습니다. 아래 한 마디 중 골라서 공격하세요.',
    opponentWeakPoints: '상대 아픈 곳',
    inputLocked: '자유 입력이 잠겼습니다',
    inputPlaceholder: '한 마디로 긁어라 (뻔한 칼·주먹은 0점)',
    attack: '공격!',
    shuffle: '🔀 다른 거',
    noIdea: '말이 안 떠오르면',
    validating: '공격을 확인하는 중…',
    submitted: '제출 완료. 상대를 기다리는 중…',
  },
  battle: { fight: '싸워!', frozen: '얼어붙음!' },
  outcome: { strong: '쾅!', normal: '쾅!', limited: '막았다!', miss: '휙!' },
  result: {
    bestShot: '최고의 한 방',
    left: '왼쪽',
    right: '오른쪽',
    win: (name) => `${name} 승리!`,
    draw: '무승부!',
    waitingOpponent: '상대를 기다리는 중…',
    rematch: '재대결!',
    rematchHint: '두 사람이 재대결을 누르면 새 경기가 시작됩니다.',
  },
}

const en: Strings = {
  appTitle: 'Anything Arena',
  langToggle: '한국어',
  start: {
    tagline: "Bring any weapon. We'll invent the reason it's strong.",
    example: 'e.g. Wet Sock vs 1% Battery Phone',
    createRoom: 'Create room (big screen)',
    soloRoom: 'Play vs AI',
    codePlaceholder: 'Room code',
    join: 'Join with code',
    createFailed: "Couldn't create a room. Please try again.",
    networkError: 'Network error. Check your connection.',
  },
  arena: {
    joinFailedTitle: 'Could not join',
    joinFailed: (status) => `Join failed (${status})`,
    joinNetworkError: 'Join request failed (network)',
    connecting: 'Connecting…',
    reconnecting: 'Reconnecting…',
    sound: 'Sound',
    shake: 'Shake',
    foul: 'Whistle! Personal attacks are a foul. Fight with your weapon.',
    foulLock: 'Free input is locked. Basic attacks only for the rest of this match.',
  },
  lobby: {
    myWeakPoints: 'My sore spots',
    weakPoints: 'Sore spots',
    howToPlay: "Each round, roast your opponent's sore spots in one line. Plain knives and fists score 0.",
    placeholderArt: 'Placeholder art',
    pickingCharacter: 'Picking a character',
    emptySeat: 'Empty seat',
    qrAlt: 'Join QR',
    joinWithPhone: 'Join with your phone',
    waitingForBoth: 'The match starts once both players pick a character and get ready.',
    nicknamePlaceholder: (max) => `Nickname (${max} chars, blank = character name)`,
    nicknameRejected: 'Please check your nickname. No attacks on real people or families.',
    entering: 'Entering…',
    enter: 'Enter as this character',
    waitingOpponent: 'Waiting for opponent…',
    ready: 'Ready!',
  },
  hud: { waiting: 'Waiting', foulCards: 'Foul cards', weakPoints: 'Sore spots', ready: 'READY', round: (n) => `ROUND ${n}` },
  action: {
    rejectDefault: 'Input rejected. Try writing it differently.',
    rejectRewrite: 'Rephrase that. Fight with your weapon.',
    rejectModeration: 'Whistle! Personal attacks are a foul. Fight with your weapon.',
    rejectFoul: 'Whistle! Personal attacks are a foul. Fight with your weapon.',
    rejectOutsideCapability: "This weapon can't do that. Try something else?",
    rejectSystemInstruction: "That's not an attack. Fight with your weapon.",
    rejectTimeout: 'Connection lag. A basic attack was used instead.',
    presetOnly: 'Two fouls. Free input is locked. Pick one of the lines below to attack.',
    opponentWeakPoints: "Opponent's sore spots",
    inputLocked: 'Free input is locked',
    inputPlaceholder: 'Roast them in one line (plain knives & fists = 0)',
    attack: 'Attack!',
    shuffle: '🔀 Others',
    noIdea: 'Out of ideas?',
    validating: 'Checking your attack…',
    submitted: 'Submitted. Waiting for opponent…',
  },
  battle: { fight: 'FIGHT!', frozen: 'Frozen!' },
  outcome: { strong: 'BAM!', normal: 'BAM!', limited: 'Blocked!', miss: 'Whiff!' },
  result: {
    bestShot: 'Best Shot',
    left: 'Left',
    right: 'Right',
    win: (name) => `${name} wins!`,
    draw: 'Draw!',
    waitingOpponent: 'Waiting for opponent…',
    rematch: 'Rematch!',
    rematchHint: 'A new match starts when both players press Rematch.',
  },
}

export const STRINGS: Record<Lang, Strings> = { ko, en }

export const stringsFor = (lang: Lang): Strings => STRINGS[lang]
