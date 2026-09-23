import type { CharacterId, PlayerSlot } from '../schemas/enums'
import type { WeaponProfile } from '../schemas/weapon'
import { DEFAULT_LANG, type Lang } from '../i18n/lang'
import { matchupRoasts } from './matchups'
import { ROSTER_EN } from './roster-en'

/**
 * 고정 출연진. "긁기 배틀" 모드: 무기를 미리 정하지 않는다.
 * 라운드마다 입력하는 한 마디가 곧 즉석 무기이고, 상대의 weakPoints 를 찌를수록 강하다.
 */
export interface RosterEntry {
  name: string
  description: string
  /** 성격·말투. 판정 모델이 '이 사람답게 긁었는지' 볼 때 쓴다. */
  persona: [string, string]
  /** 이걸 찌르면 STRONG. 화면에도 힌트로 보여준다. */
  weakPoints: [string, string, string]
  /** 말이 안 떠오를 때 누르는 추천 한 마디. 앞 2개는 구버전 호환용(suggestedRoasts 와 동일). */
  suggestedRoasts: [Roast, Roast]
  /** 추천 한 마디 10개. 카드의 techniques 로 그대로 실려 휴대폰 칩·봇·반칙 상태 버튼에 쓰인다. */
  roastPool: Roast[]
  visualTag: WeaponProfile['visualTag']
  /** 말맛. 판정은 '이 사람 말투답게 긁었는지'를 보고, 해설은 이 말투를 살짝 흉내낸다. 숫자에는 영향 없음. */
  voice: CharacterVoice
}

export interface Roast {
  label: string
  text: string
  animation: WeaponProfile['techniques'][number]['animation']
}

export interface CharacterVoice {
  /** 말투 한 줄. */
  tone: string
  /** 입에 달고 사는 말 2개. */
  catchphrases: [string, string]
  /** 들으면 발끈하는 것 2개. 약점(weakPoints)과 달리 피해를 올리진 않고, 판정 맥락에만 쓴다. */
  hates: [string, string]
}

export const ROSTER: Record<CharacterId, RosterEntry> = {
  grandma: {
    name: '욕쟁이 할머니',
    description: '순대국밥 20년차 욕쟁이 할머니. 국자와 국물, 거친 입담이 무기.',
    persona: ['20년 장사 짬바로 후려치는 입담', '국물처럼 뜨겁고 끈적한 잔소리'],
    weakPoints: ['요즘 것들·MZ 말투', '무릎·허리', '스마트폰·키오스크'],
    suggestedRoasts: [
      { label: '국물 회오리', text: '너 같은 건 순대국밥 국물에 말아 먹어도 간이 안 맞겠다', animation: 'SHOCKWAVE' },
      { label: '국자 후려치기', text: '숙제는 했냐? 국자로 등짝 스매싱 들어간다', animation: 'DASH' },
    ],
    visualTag: 'HEAVY',
    roastPool: [
      { label: '국물 회오리', text: '너 같은 건 순대국밥 국물에 말아 먹어도 간이 안 맞겠다', animation: 'SHOCKWAVE' },
      { label: '국자 후려치기', text: '숙제는 했냐? 국자로 등짝 스매싱 들어간다', animation: 'DASH' },
      { label: '밥은 먹고', text: '어이구 이놈아, 밥은 먹고 다니냐? 얼굴이 순대 껍데기만 하네', animation: 'DASH' },
      { label: '20년 짬', text: '내가 국밥 20년 팔면서 너 같은 진상 300명은 봤다', animation: 'SHOCKWAVE' },
      { label: '깍두기 취급', text: '너는 국밥집 깍두기야. 있으나 없으나 아무도 신경 안 써', animation: 'PROJECTILE' },
      { label: '공깃밥 추가', text: '말대꾸할 힘 있으면 공깃밥 추가나 해라, 이놈아', animation: 'DASH' },
      { label: '식은 국밥', text: '열정이 식은 국밥이네. 데워 줄까? 국자로?', animation: 'PSYCHIC' },
      { label: '설거지', text: '그 입으로 설거지나 해. 우리 가게 3년은 해야 사람 되겠다', animation: 'DASH' },
      { label: '손님 취급', text: '어이구, 손님이면 앉아서 먹기나 하지 왜 말이 많아', animation: 'PSYCHIC' },
      { label: '무릎보다', text: '내 무릎보다 네 인생이 더 삐걱거린다, 이놈아', animation: 'SHOCKWAVE' },
    ],
    voice: {
      tone: '반말 호통. 문장 끝에 "이놈아", "어이구" 를 붙이고 국밥·장사 비유로 후려친다',
      catchphrases: ['어이구 이놈아', '밥은 먹고 다니냐'],
      hates: ['국밥이 짜다는 소리', '할머니 폰 못 쓴다는 놀림'],
    },
  },
  jaemmin: {
    name: '이잼민',
    description: '내 나이 15 이잼민. "응?" 한마디 말대꾸와 키보드가 무기.',
    persona: ['"응? 아닌데?" 무한 말대꾸', '키보드 워리어 급 타이핑 속도'],
    weakPoints: ['엄마·숙제·용돈', '학원·시험', '구닥다리·옛날 사람 소리'],
    suggestedRoasts: [
      { label: '응? 반사', text: '응? 할머니 그거 요즘 아무도 안 씀 ㅋㅋ 구닥다리 인증', animation: 'PSYCHIC' },
      { label: '키보드 연타', text: '할머니 키오스크 앞에서 10분 서 있던 거 다 봤음', animation: 'PROJECTILE' },
    ],
    visualTag: 'ELECTRIC',
    roastPool: [
      { label: '응? 반사', text: '응? 그거 요즘 아무도 안 씀 ㅋㅋ 구닥다리 인증', animation: 'PSYCHIC' },
      { label: '키보드 연타', text: '키오스크 앞에서 10분 서 있던 거 다 봤음 ㅋㅋㅋ', animation: 'PROJECTILE' },
      { label: '응? 아닌데?', text: '응? 아닌데? 그건 님 생각이고 ㅋㅋ', animation: 'PSYCHIC' },
      { label: '틀린 그림', text: '말하는 거 보니까 유튜브 댓글창 틀린 그림 찾기 수준 ㅋㅋ', animation: 'PROJECTILE' },
      { label: '렉 걸림', text: '말이 왜 이렇게 느려요? 뇌에 렉 걸리셨나 ㅋㅋ', animation: 'SHOCKWAVE' },
      { label: '개웃기네', text: 'ㅋㅋ 개웃기네 그걸 공격이라고 하심?', animation: 'PSYCHIC' },
      { label: '초딩도', text: '그거 우리 반 초딩도 안 하는 소리인데 ㅋㅋ', animation: 'PROJECTILE' },
      { label: '업데이트', text: '님 업데이트 좀 하셈. 2010년에 멈춰 있음', animation: 'SHOCKWAVE' },
      { label: '스킵', text: '말 길어서 스킵함 ㅋㅋ 요약본 있음?', animation: 'PSYCHIC' },
      { label: '현실 튜토리얼', text: '현실 튜토리얼도 못 깬 분이 왜 저한테 훈수 ㅋㅋ', animation: 'DASH' },
    ],
    voice: {
      tone: '초성·ㅋㅋ 섞인 짧은 채팅체. "응? 아닌데?" 로 받아치고 게임·유튜브 비유를 쓴다',
      catchphrases: ['응? 아닌데?', 'ㅋㅋ 개웃기네'],
      hates: ['애 취급', '게임 실력 무시'],
    },
  },
  daeri: {
    name: '퇴근 1분 전 김대리',
    description: '퇴근 1분 전 김대리. 넥타이는 풀렸고 손에는 키보드. 야근 3년차의 한숨이 무기.',
    persona: ['"이거 오늘까지죠?" 한 마디에 영혼이 빠져나가는 회사원', '보고서·회의·엑셀 비유로 사람을 반려시키는 직장인 화법'],
    weakPoints: ['야근·주말 출근', '월급·연봉·상여금', '부장님·퇴근 직전 업무 카톡'],
    suggestedRoasts: [
      { label: '퇴근 각', text: '너랑 말 섞는 시간도 야근 수당 나오냐? 안 나오면 나 퇴근한다', animation: 'DASH' },
      { label: '보고서 반려', text: '그 논리면 보고서 첫 줄에서 반려야. 다시 써 와, 오늘까지', animation: 'PROJECTILE' },
    ],
    visualTag: 'SHAKY',
    roastPool: [
      { label: '퇴근 각', text: '너랑 말 섞는 시간도 야근 수당 나오냐? 안 나오면 나 퇴근한다', animation: 'DASH' },
      { label: '보고서 반려', text: '그 논리면 보고서 첫 줄에서 반려야. 다시 써 와, 오늘까지', animation: 'PROJECTILE' },
      { label: '회의 소집', text: '하... 그 말 하려고 회의 잡은 거예요? 30분 날렸네', animation: 'PSYCHIC' },
      { label: '엑셀 오류', text: '네 인생 엑셀로 열면 #REF! 만 뜰 듯', animation: 'PROJECTILE' },
      { label: '인수인계', text: '너 같은 사람 인수인계 받으면 사표부터 쓴다', animation: 'DASH' },
      { label: '상여금', text: '그 정도 실력이면 상여금은커녕 회식비도 아깝다', animation: 'SHOCKWAVE' },
      { label: '이거 오늘까지죠', text: '하... 이거 오늘까지죠? 그럼 너부터 정리 들어갑니다', animation: 'DASH' },
      { label: '참조 빼기', text: '앞으로 내 인생 메일 참조에서 너 빼겠습니다', animation: 'PROJECTILE' },
      { label: '수정 요청', text: '네 존재 자체가 수정 요청 사항인데 반영은 언제 돼요?', animation: 'PSYCHIC' },
      { label: '연차 사용', text: '너 상대하느니 연차 쓰고 집에서 천장 볼래', animation: 'SHOCKWAVE' },
    ],
    voice: {
      tone: '지친 직장인 말투. "하...", "아 진짜" 로 시작하고 회사·보고서·회의 비유로 건조하게 받아친다',
      catchphrases: ['하... 이거 오늘까지죠?', '퇴근하겠습니다'],
      hates: ['"열정이 부족하다" 소리', '퇴근 1분 전 카톡 알림'],
    },
  },
  alba: {
    name: '야간 300일차 편의점 알바',
    description: '야간 300일차 편의점 알바. 반쯤 감긴 눈에 바코드 스캐너. 진상 300명을 견딘 무표정이 무기.',
    persona: ['무슨 말을 들어도 눈 하나 깜짝 안 하는 무표정', '"봉투 필요하세요?" 톤으로 사람을 재고 취급하는 건조한 말투'],
    weakPoints: ['시급·최저임금', '진상 손님·"학생 알바" 반말', '유통기한·폐기 도시락'],
    suggestedRoasts: [
      { label: '바코드 스캔', text: '삑. 조회 결과: 1+1 행사 붙여도 안 나가는 재고입니다', animation: 'PROJECTILE' },
      { label: '폐기 처리', text: '유통기한 지난 말은 폐기함에 넣어드릴게요. 봉투는 20원입니다', animation: 'SHOCKWAVE' },
    ],
    visualTag: 'ICE',
    roastPool: [
      { label: '바코드 스캔', text: '삑. 조회 결과: 1+1 행사 붙여도 안 나가는 재고입니다', animation: 'PROJECTILE' },
      { label: '폐기 처리', text: '유통기한 지난 말은 폐기함에 넣어드릴게요. 봉투는 20원입니다', animation: 'SHOCKWAVE' },
      { label: '봉투 필요', text: '봉투 필요하세요? 그 말은 담아 갈 가치가 없어서요', animation: 'PSYCHIC' },
      { label: '포인트 적립', text: '포인트 적립하세요? 말 한마디에 0점 적립됐습니다', animation: 'PROJECTILE' },
      { label: '진상 300명', text: '진상 300명 봤는데 순위 갱신하셨네요. 축하드립니다', animation: 'PSYCHIC' },
      { label: '삼각김밥', text: '삼각김밥 포장도 못 뜯을 분이 저를 뜯으시려고요', animation: 'DASH' },
      { label: '재고 없음', text: '삑. 그 논리, 재고 없습니다. 입고 예정도 없어요', animation: 'PROJECTILE' },
      { label: '반품 불가', text: '한 번 뱉은 말은 반품 안 됩니다. 영수증 있어도요', animation: 'SHOCKWAVE' },
      { label: '야간 할증', text: '새벽에 그 소리 하시면 야간 할증 붙습니다', animation: 'PSYCHIC' },
      { label: '현금 영수증', text: '현금 영수증 해드릴까요? 오늘 하신 말 전부 지출 처리해서요', animation: 'DASH' },
    ],
    voice: {
      tone: '높낮이 없는 존댓말. 편의점 멘트("~하세요?", "~입니다")로 비꼬고 절대 흥분하지 않는다',
      catchphrases: ['봉투 필요하세요?', '삑.'],
      hates: ['"학생, 이거 왜 안 돼요?" 반말 진상', '밤에 잠 안 자냐는 소리'],
    },
  },
  chongmu: {
    name: '단톡방 지배자 산악회 총무',
    description: '단톡방 지배자 산악회 총무. 형광 등산복에 등산 스틱. 새벽 5시 "굿모닝~" 카톡 폭탄이 무기.',
    persona: ['공지 하나로 회원 40명을 새벽에 깨우는 조직력', '"인생은 산이야~" 식 등산 비유와 이모티콘 폭격'],
    weakPoints: ['읽씹·단톡방 나가기', '회비·정산 미납', '젊은 애들 산행 안 온다는 소리'],
    suggestedRoasts: [
      { label: '공지 폭탄', text: '[공지] 이번 주 산행 불참자 명단 1번에 너 이름 올린다~ ^^ 필독!', animation: 'PROJECTILE' },
      { label: '스틱 찍기', text: '그 체력으로 무슨 말싸움이야~ 청계산 입구에서 벌써 주저앉을 사람이', animation: 'DASH' },
    ],
    visualTag: 'SHINY',
    roastPool: [
      { label: '공지 폭탄', text: '[공지] 이번 주 산행 불참자 명단 1번에 너 이름 올린다~ ^^ 필독!', animation: 'PROJECTILE' },
      { label: '스틱 찍기', text: '그 체력으로 무슨 말싸움이야~ 청계산 입구에서 벌써 주저앉을 사람이', animation: 'DASH' },
      { label: '굿모닝', text: '굿모닝~ 좋은 아침입니다 ^^ 새벽 5시니까 이제 일어나세요~', animation: 'SHOCKWAVE' },
      { label: '회비 미납', text: '[공지] 회비 미납자는 발언권 없습니다~ 정산 먼저 하세요 ^^', animation: 'PROJECTILE' },
      { label: '정상 인증샷', text: '정상 인증샷 한 장 없는 사람이 인생을 논해~? 허허 ^^', animation: 'PSYCHIC' },
      { label: '읽씹 감지', text: '내 카톡 읽씹한 거 다 알아요~ 산에서 보자고요 ^^', animation: 'PSYCHIC' },
      { label: '막걸리 당번', text: '[공지] 너는 이번 주 막걸리 당번~ 하산까지 들고 와요 ^^', animation: 'DASH' },
      { label: '인생은 산', text: '인생은 산이야~ 넌 아직 주차장에서 신발 끈 매는 중이고 ^^', animation: 'SHOCKWAVE' },
      { label: '단체 사진', text: '단체 사진에서 너만 흔들렸더라~ 인생도 흔들리는 거 아냐? ^^', animation: 'PROJECTILE' },
      { label: '하산 명령', text: '[공지] 지금 하산하세요~ 더 올라오면 구조대 불러야 해요 ^^', animation: 'DASH' },
    ],
    voice: {
      tone: '물결표(~)와 ^^ 를 남발하는 아저씨 카톡체. [공지] 로 시작하고 산·정상·회비 비유로 찍어 누른다',
      catchphrases: ['굿모닝~ 좋은 아침입니다 ^^', '[공지] 필독!'],
      hates: ['단톡방 조용히 나가기', '"총무님 카톡 좀 그만" 소리'],
    },
  },
  wonjang: {
    name: '동네 소문 다 아는 미용실 원장님',
    description: '동네 소문 다 아는 미용실 원장님. 풍성한 머리에 대형 드라이어. 20년치 동네 비밀이 무기.',
    persona: ['이 동네 모든 집 숟가락 개수까지 아는 정보력', '"어머 자기야~" 로 시작해 웃으면서 비수를 꽂는 미용실 화법'],
    weakPoints: ['탈모·머리숱', '옆 건물 신규 미용실·프랜차이즈', '단골 이탈·예약 노쇼'],
    suggestedRoasts: [
      { label: '소문 방송', text: '어머 자기야, 자기 얘기 우리 가게에서 벌써 다 돌았어~ 좋은 얘기는 아니더라', animation: 'PSYCHIC' },
      { label: '드라이어 폭풍', text: '그 머리로 나한테 덤벼? 뿌리부터 비어 가는 거 다 보이는데~', animation: 'SHOCKWAVE' },
    ],
    visualTag: 'SOFT',
    roastPool: [
      { label: '소문 방송', text: '어머 자기야, 자기 얘기 우리 가게에서 벌써 다 돌았어~ 좋은 얘기는 아니더라', animation: 'PSYCHIC' },
      { label: '드라이어 폭풍', text: '그 머리로 나한테 덤벼? 뿌리부터 비어 가는 거 다 보이는데~', animation: 'SHOCKWAVE' },
      { label: '안 하려고 했는데', text: '내가 이 얘기 안 하려고 했는데~ 자기 옆집이 그러더라, 자기 좀 그렇다고', animation: 'PSYCHIC' },
      { label: '염색 실패', text: '어머 자기야, 그 말은 셀프 염색처럼 얼룩덜룩하네~', animation: 'PROJECTILE' },
      { label: '예약 노쇼', text: '자기 인생도 노쇼야? 예약만 해 놓고 아무것도 안 오네~', animation: 'DASH' },
      { label: '숱 정리', text: '말이 너무 많아서 숱 좀 쳐야겠다~ 반은 덜어내자, 응?', animation: 'DASH' },
      { label: '단골 평가', text: '우리 단골들이 자기 보고 그러더라, 볼 게 없대~ 어머 미안', animation: 'PSYCHIC' },
      { label: '파마 풀림', text: '그 자신감 파마처럼 이틀이면 풀려~ 내가 봤잖아', animation: 'SHOCKWAVE' },
      { label: '가위 들기', text: '어머, 자기 그 말 계속하면 나 가위 들어야 돼~ 앞머리부터', animation: 'PROJECTILE' },
      { label: '동네 1등', text: '자기가 이 동네 1등이야, 얘깃거리로는~ 어머 자기야 축하해', animation: 'PSYCHIC' },
    ],
    voice: {
      tone: '"어머 자기야~" 로 시작하는 살가운 반말. 웃으면서 남의 사정을 들먹이고 머리·헤어스타일 비유로 긁는다',
      catchphrases: ['어머 자기야~', '내가 이 얘기 안 하려고 했는데'],
      hates: ['"머리 망쳤다" 소리', '옆 가게가 더 싸다는 말'],
    },
  },
}

/** 언어별 출연진. ROSTER 는 한국어 원본이고 en 은 roster-en.ts 에서 다시 쓴 카드다. */
export const ROSTER_BY_LANG: Record<Lang, Record<CharacterId, RosterEntry>> = { ko: ROSTER, en: ROSTER_EN }

export const rosterEntry = (id: CharacterId, lang: Lang = DEFAULT_LANG): RosterEntry => ROSTER_BY_LANG[lang][id]

export const rosterDescription = (id: CharacterId | null | undefined, lang: Lang = DEFAULT_LANG): string => (id ? rosterEntry(id, lang).description : '')

/** 출연진이 아닌 자유 입력 무기에는 말맛이 없다. */
export const rosterVoice = (id: CharacterId | null | undefined, lang: Lang = DEFAULT_LANG): CharacterVoice | null => (id ? rosterEntry(id, lang).voice : null)

export const DEFAULT_CHARACTER_FOR_SLOT: Record<PlayerSlot, CharacterId> = { A: 'grandma', B: 'jaemmin' }

/** 출연진 카드. WeaponProfile 형태를 그대로 써서 엔진·화면·판정 계약을 바꾸지 않는다. technique id 는 언어와 무관하게 같다. */
/** WeaponProfile.techniques 최대 개수 (schemas/weapon.ts 의 max 와 같다). */
const MAX_TECHNIQUES = 10

/**
 * 출연진 카드. opponentId 를 주면 그 상대의 아픈 곳을 찌르는 매치업 대사를 앞에 싣고,
 * 나머지는 자기 목소리 풀로 채운다. 상대를 모르는 입장 시점엔 풀만 싣고, 둘 다 준비되면 엔진이 다시 만든다.
 */
export const characterCard = (id: CharacterId, matchId: string, lang: Lang = DEFAULT_LANG, opponentId: CharacterId | null = null): WeaponProfile => {
  const r = rosterEntry(id, lang)
  const targeted = (opponentId ? matchupRoasts(id, opponentId, lang) : []).map((roast, i) => ({
    id: `${id}-vs-${opponentId}-r${i + 1}`, name: roast.label, actionText: roast.text, animation: roast.animation, hitsWeakPoint: true as const,
  }))
  const own = r.roastPool.slice(0, MAX_TECHNIQUES - targeted.length).map((roast, i) => ({ id: `${id}-r${i + 1}`, name: roast.label, actionText: roast.text, animation: roast.animation }))
  return {
    id: `${matchId}-${id}`,
    version: 1,
    characterName: r.name,
    characterId: id,
    imageUrl: null,
    displayName: r.name,
    tagline: r.description,
    capabilities: [...r.persona],
    weakness: r.weakPoints.join(', '),
    visualTag: r.visualTag,
    techniques: [...targeted, ...own],
  }
}
