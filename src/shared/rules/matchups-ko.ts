// 생성됨: node scripts/gen-matchups.mjs ko (모델 openai/gpt-5-mini). 손으로 다듬어도 된다.
// 공격자 말투로 수비자의 아픈 곳을 찌르는 추천 한 마디. characterCard(…, opponentId) 가 앞쪽에 싣는다.
import type { CharacterId } from '../schemas/enums'
import type { Roast } from './roster'

export const MATCHUP_ROASTS_KO: Record<CharacterId, Partial<Record<CharacterId, Roast[]>>> = {
  grandma: {
    jaemmin: [
      { label: '용돈 한방', text: '엄마한테 용돈 타령만 하냐, 밥은 먹고 다니냐 이놈아', animation: 'PROJECTILE' },
      { label: '학원 데우기', text: '학원 시험 스트레스? 국밥 한 그릇에 뇌 좀 데워 와 이놈아', animation: 'DASH' },
      { label: '구닥다리', text: '네 말투가 구닥다리라 장사 첫날 손님도 도망가 어이구', animation: 'SHOCKWAVE' },
      { label: '애취급', text: '애 취급 싫다면서 아직 젖병 더 챙겨와라, 장사판이냐 이놈아', animation: 'PSYCHIC' },
    ],
    daeri: [
      { label: '식은국밥', text: '야근하느라 국밥도 식어서 가냐 이놈아', animation: 'DASH' },
      { label: '월급국물', text: '월급이 설렁탕 국물만큼 허전하냐, 밥은 먹고 다니냐 어이구', animation: 'SHOCKWAVE' },
      { label: '퇴근카톡', text: '퇴근 1분 전에 부장님 카톡 오면 장사 접는 줄 알어 이놈아', animation: 'PROJECTILE' },
      { label: '열정국자', text: '열정 부족 소리 들리면 국밥 장사처럼 한 수 배워라 이놈아', animation: 'PSYCHIC' },
    ],
    alba: [
      { label: '시급잔소리', text: '시급으로 사람 값 매기냐, 장사도 안 배웠냐 이놈아', animation: 'PSYCHIC' },
      { label: '학생경멸', text: '학생인 척 반말하면 국밥국물도 식는다 이놈아', animation: 'PROJECTILE' },
      { label: '유통폭로', text: '네 도시락 유통기한 지났어, 네 표정도 폐기 어이구 이놈아', animation: 'SHOCKWAVE' },
      { label: '밤샘쏘기', text: '밤에 잠 안 자냐 소리 그만해, 너부터 먼저 자라 이놈아', animation: 'DASH' },
    ],
    chongmu: [
      { label: '읽씹소리', text: '단톡에서 읽씹하냐, 국밥 국물 식게 하냐 이놈아', animation: 'DASH' },
      { label: '회비독촉', text: '회비·정산은 언제냐, 국밥값도 못 챙기면 장사 접어 어이구', animation: 'PROJECTILE' },
      { label: '젊은층탈락', text: '젊은 애들 산행 안 온다 말하지 마라, 코스가 국밥처럼 재미없어 이놈아', animation: 'SHOCKWAVE' },
      { label: '카톡폭탄', text: '굿모닝 카톡 폭탄에 \'총무님 카톡 좀 그만\' 듣고 싶냐, 밥은 먹고 다니냐 이놈아', animation: 'PSYCHIC' },
    ],
    wonjang: [
      { label: '숱국밥', text: '머리숱이 국물처럼 줄었구나, 이놈아', animation: 'SHOCKWAVE' },
      { label: '분점', text: '옆 프랜차이즈에 손님 뺏기겠네, 장사 접으려나 어이구', animation: 'PROJECTILE' },
      { label: '예약노쇼', text: '단골이 예약 노쇼 하면 그릇만 남지, 밥은 먹고 다니냐 이놈아', animation: 'DASH' },
      { label: '망쳤다', text: '손님이 \'머리 망쳤다\' 하면 네 평판 국물처럼 퍼지겠구나 어이구', animation: 'PSYCHIC' },
    ],
  },
  jaemmin: {
    grandma: [
      { label: 'MZ도발', text: '응? 아닌데? 할매 MZ말투 쓰면 레거시 패치ㅋㅋ', animation: 'PSYCHIC' },
      { label: '허리리셋', text: '허리 삐끗하면 리스폰 불가, 국밥 못 저을걸ㅋㅋ', animation: 'SHOCKWAVE' },
      { label: '터치미스', text: '키오스크 뜨면 \'홈\'만 연타하는 프로ㅋㅋ', animation: 'PROJECTILE' },
      { label: '국밥방어', text: '국밥 짜다 소리만 들으면 댓글로 현역 셰프됨ㅋㅋ', animation: 'DASH' },
    ],
    daeri: [
      { label: '야근DLC', text: '응? 아닌데? 야근이 DLC야? 본편은 끝났잖아', animation: 'PSYCHIC' },
      { label: '월급박스', text: '월급 상자 열어봤더니 먼지랑 0원 ㅋㅋ', animation: 'PROJECTILE' },
      { label: '보스카톡', text: '퇴근 1분 전 부장님 카톡? 보스 스폰 타임 ㅋㅋ', animation: 'SHOCKWAVE' },
      { label: '열정패치', text: '열정 부족 소리 들음? 패치 노트 어디임 ㅋㅋ', animation: 'DASH' },
    ],
    alba: [
      { label: '시급너프', text: '응? 아닌데? 시급이 보스 보상도 아니고 ㅋㅋ', animation: 'PSYCHIC' },
      { label: '반말팝업', text: '뭐야 반말? 팝업 광고랑 같은 레벨이네 ㅋㅋ', animation: 'SHOCKWAVE' },
      { label: '폐기템', text: '유통기한 넘은 도시락? 레어 폐기템 등장 ㅋㅋ', animation: 'PROJECTILE' },
      { label: '야근알람', text: '밤에 잠 안 자냐고? 넌 내 스트리밍 알람이냐 ㅋㅋ', animation: 'DASH' },
    ],
    chongmu: [
      { label: '읽씹대회', text: '응? 아닌데? 총무님 읽씹은 등산보다 프로네 ㅋㅋ', animation: 'PSYCHIC' },
      { label: '회비실종', text: '회비 어디냐, 정산은 사라진 보물찾기냐 ㅋㅋ', animation: 'PROJECTILE' },
      { label: '젊은탈주', text: '젊은애들 안 온다 하지마, 새벽 굿모닝~ 카톡이 원인임 ㅋㅋ', animation: 'SHOCKWAVE' },
      { label: '조용히탈퇴', text: '단톡 조용히 나간다? 총무님 카톡 파티 때문에 누가 가겠어 ㅋㅋ', animation: 'DASH' },
    ],
    wonjang: [
      { label: '드라이스캔', text: '응? 아닌데? 드라이보다 머리숱이 먼저 말라가네.', animation: 'PSYCHIC' },
      { label: '신규알림', text: '응? 아닌데? 옆에 프랜차이즈 생겼다며, 메뉴판 좀 공유해.', animation: 'PROJECTILE' },
      { label: '예약리스트', text: '응? 아닌데? 단골 예약이 \'미확인\'으로 줄줄이네.', animation: 'SHOCKWAVE' },
      { label: '클레임빔', text: '응? 아닌데? "머리 망쳤다" 소리만 나면 난리라며 ㅋㅋ 개웃기네', animation: 'DASH' },
    ],
  },
  daeri: {
    grandma: [
      { label: 'MZ리포트', text: '하... MZ 말투로 회의록 쓰지 마세요, 보고서가 헷갈려요.', animation: 'PSYCHIC' },
      { label: '무릎경고', text: '아 진짜, 무릎 소리가 회의 알람보다 시끄럽네요.', animation: 'SHOCKWAVE' },
      { label: '키오스크', text: '하... 키오스크 보면서 \'다음\'을 못 누르시네요.', animation: 'PROJECTILE' },
      { label: '국밥퇴근', text: '하... 국밥 짜다고 하시면 저도 퇴근하겠습니다.', animation: 'DASH' },
    ],
    jaemmin: [
      { label: '용돈결재', text: '아 진짜 엄마 결재 없인 용돈도 통과 못 하는 보고서네.', animation: 'PROJECTILE' },
      { label: '시험캘린더', text: '하... 학원·시험 일정이 내 회의 캘린더보다 빽빽하네.', animation: 'SHOCKWAVE' },
      { label: '구닥다리팩스', text: '하... 네 구닥다리 말투, 마치 팩스 보고서야.', animation: 'DASH' },
      { label: '회의록경고', text: '하... 이거 오늘까지죠? 애 취급은 회의록에 적지 마.', animation: 'PSYCHIC' },
    ],
    alba: [
      { label: '제로시급', text: '하... 엑셀 합계에 시급이 0원으로 찍혔네요.', animation: 'PSYCHIC' },
      { label: '학생호칭', text: '아 진짜, \'학생\'이라고 반말하면 연차표부터 첨부하겠습니다.', animation: 'DASH' },
      { label: '도시락마감', text: '하... 보고서 유통기한 지나면 폐기하듯, 도시락도 마감입니다.', animation: 'SHOCKWAVE' },
      { label: '회의이관', text: '하... \'학생, 이거 왜 안 돼요?\'는 회의로 넘기겠습니다. 퇴근하겠습니다', animation: 'PSYCHIC' },
    ],
    chongmu: [
      { label: '읽씹리포트', text: '하... 읽씹은 보고서 읽고 제출 버튼만 안 누르는 거네.', animation: 'PSYCHIC' },
      { label: '회비마감', text: '하... 이거 오늘까지죠? 회비 정산도 오늘까지입니다.', animation: 'DASH' },
      { label: '젊은불참', text: '아 진짜, \'젊은 애들 안 온다\'는 건 결재선에서 반려된 보고서 같네.', animation: 'SHOCKWAVE' },
      { label: '조용히탈출', text: '하... 단톡 조용히 나가네, 출석부에 미참석 찍어둘게.', animation: 'PROJECTILE' },
    ],
    wonjang: [
      { label: '엑셀감축', text: '하... 엑셀 줄 삭제되듯 머리숱도 줄어드네요.', animation: 'PSYCHIC' },
      { label: '프랜차이즈', text: '아 진짜, 옆 프랜차이즈 기획서 한 장에 단골 날아가요.', animation: 'PROJECTILE' },
      { label: '노쇼보고', text: '하... 이거 오늘까지죠? 예약 노쇼가 잦으면 매출 보고서가 폭삭입니다.', animation: 'SHOCKWAVE' },
      { label: '가격비교', text: '아 진짜, \'옆 가게가 더 싸다\' 한마디에 전략회의가 소집되네요.', animation: 'DASH' },
    ],
  },
  alba: {
    grandma: [
      { label: 'MZ스캔', text: 'MZ 말투로 \'쩐다\' 하시면 바코드가 못 알아듣습니다, 봉투 필요하세요?', animation: 'PSYCHIC' },
      { label: '무릎주의', text: '무릎 안 좋으세요? 오래 서시면 더 아프실 텐데요.', animation: 'SHOCKWAVE' },
      { label: '대리터치', text: '스마트폰 못 쓰세요? 키오스크 대신 제가 눌러드릴까요?', animation: 'PROJECTILE' },
      { label: '국밥클레임', text: '국밥이 짜다 하시면 레시피 탓입니다.', animation: 'DASH' },
    ],
    jaemmin: [
      { label: '용돈조회', text: '오늘 용돈은 몇 월분입니까? 봉투 필요하세요?', animation: 'PROJECTILE' },
      { label: '수강조회', text: '학원은 몇 개 등록하셨습니까? 포인트 적립은 없습니다.', animation: 'PSYCHIC' },
      { label: '구닥지적', text: '그 장비 구닥다리입니까? 교환 불가입니다.', animation: 'SHOCKWAVE' },
      { label: '실력판정', text: '게임 실력으로 우기시겠습니까? 점수판은 없습니다.', animation: 'DASH' },
    ],
    daeri: [
      { label: '퇴근방해', text: '퇴근 1분 남았는데 카톡 오셨나요? 봉투 필요하세요?', animation: 'PSYCHIC' },
      { label: '주말출근', text: '야근이세요? 오늘도 주말 출근입니다.', animation: 'SHOCKWAVE' },
      { label: '월급조회', text: '월급 확인하세요? 올해도 같은 금액입니다.', animation: 'PROJECTILE' },
      { label: '열정멘트', text: '‘열정이 부족하다’ 소리요? 카운터에선 안 팔립니다.', animation: 'DASH' },
    ],
    chongmu: [
      { label: '읽씹경보', text: '단톡 읽씹만 하시나요? 봉투 필요하세요?', animation: 'PSYCHIC' },
      { label: '회비미납', text: '회비 정산입니다. 아직 미납이십니다.', animation: 'SHOCKWAVE' },
      { label: '젊은불참', text: '젊은 애들 안 온다 하시네요. 출석 체크는 하세요?', animation: 'PROJECTILE' },
      { label: '카톡그만', text: '"총무님 카톡 좀 그만" 소리 들으셨나요? 알람 끄실까요?', animation: 'DASH' },
    ],
    wonjang: [
      { label: '무표정 스캔', text: '머리숱 확인하세요? 거울보다 천장이 더 보입니다.', animation: 'PSYCHIC' },
      { label: '새가게 경보', text: '옆 건물 프랜차이즈 오픈이세요? 단골이 줄어듭니다.', animation: 'DASH' },
      { label: '예약 접수', text: '단골 예약 노쇼입니까? 봉투 필요하세요?', animation: 'PROJECTILE' },
      { label: '가격 비교', text: '옆 가게가 더 싸다 말하세요? 영수증 보여주십시오.', animation: 'SHOCKWAVE' },
    ],
  },
  chongmu: {
    grandma: [
      { label: '공지파동', text: '[공지] 필독! MZ 말투면 정상에서 통역 필요해요~ ^^', animation: 'SHOCKWAVE' },
      { label: '무릎점검', text: '정상은 멀어도 무릎은 먼저 챙겨라~ ^^', animation: 'DASH' },
      { label: '키오스크체크', text: '키오스크 앞에서 헤매면 회비보다 시간만 손해입니다~ ^^', animation: 'PROJECTILE' },
      { label: '국밥징크스', text: '국밥이 짜다 하면 내 공지로 간이 재조정될걸요~ ^^', animation: 'PSYCHIC' },
    ],
    jaemmin: [
      { label: '새벽알림', text: '굿모닝~ 좋은 아침입니다 ^^ 용돈 탕진하면 정상 못 가요~', animation: 'PSYCHIC' },
      { label: '시험지적', text: '시험 핑계로 정상 못 온다더니 약속은 지켜라~', animation: 'DASH' },
      { label: '구닥충격', text: '구닥다리 소리로 정상 가르치지 마~ 시대가 웃는다^^', animation: 'SHOCKWAVE' },
      { label: '실력검증', text: '게임 실력 무시하진 마라~ 키보드로 정상 깰 줄 알아?', animation: 'PROJECTILE' },
    ],
    daeri: [
      { label: '퇴근방해', text: '[공지] 퇴근 1분 전 카톡은 정상에 없는 소리~ ^^', animation: 'PSYCHIC' },
      { label: '주말등산', text: '야근·주말 출근은 등산로 이탈이야~ 쉬어야 정상이지 ^^', animation: 'DASH' },
      { label: '회비정산', text: '월급 얘기만 나오면 내 마음이 비었네~ 회비부터 점검해봐 ^^', animation: 'PROJECTILE' },
      { label: '열정체크', text: '열정이 부족하다 소리 들으면 정상 인증 취소~ ^^', animation: 'SHOCKWAVE' },
    ],
    alba: [
      { label: '시급등반', text: '[공지] 굿모닝~ 좋은 아침입니다 ^^ 시급이 봉우리라도 있나요~', animation: 'SHOCKWAVE' },
      { label: '반말봉', text: '[공지] 반말 들리면 정상에서도 귀가 닫혀요~ \'학생\' 소리에 웃음이 납니다^^', animation: 'PSYCHIC' },
      { label: '폐기산', text: '[공지] 유통기한 보면 등반도 포기~ 도시락이 정상보다 오래 버티네요~', animation: 'PROJECTILE' },
      { label: '밤샘질문', text: '[공지] 밤에 잠 안 자냐고요? 정상은 새벽에 오르는 사람만 알죠~', animation: 'PSYCHIC' },
    ],
    wonjang: [
      { label: '노쇼경보', text: '굿모닝~ 좋은 아침입니다 ^^ 단골들 정상은 가도 예약은 안 오네~', animation: 'PSYCHIC' },
      { label: '숱점검', text: '머리숱이 산허리 같네~ 바람 불면 정상 다 보이겠다^^', animation: 'DASH' },
      { label: '프랜차이즈', text: '옆 건물 프랜차이즈 생겼다며~ 등산객들 다 빼앗기겠네', animation: 'PROJECTILE' },
      { label: '값비교', text: '옆 가게가 더 싸다 하면~ 값으로 정상 찍어보시라^^', animation: 'SHOCKWAVE' },
    ],
  },
  wonjang: {
    grandma: [
      { label: '레트로컷', text: '어머 자기야~ MZ 말투, 네 파마만큼 유행 지난 걸로 들려.', animation: 'PSYCHIC' },
      { label: '삐걱펀치', text: '자기야~ 비어있는 샴푸통보다 네 무릎이 더 삐걱거려.', animation: 'DASH' },
      { label: '터치미스', text: '자기야~ 키오스크 앞에서 네 손, 빗질보다 서툴러.', animation: 'PROJECTILE' },
      { label: '국자충격', text: '자기야~ \'국밥 짜다\' 소리엔 내 드라이어도 식은땀 흘려.', animation: 'SHOCKWAVE' },
    ],
    jaemmin: [
      { label: '용돈컷', text: '어머 자기야~ 엄마한테 용돈 구걸하는 거, 셀프 컷 같네.', animation: 'PSYCHIC' },
      { label: '학원행', text: '어머 자기야~ 학원 가는 너, 드라이 바람 맞은 인형 같아.', animation: 'DASH' },
      { label: '레트로파마', text: '어머 자기야~ 옛날 사람 소리 들을 때, 네 머리만큼 레트로하네.', animation: 'PROJECTILE' },
      { label: '애취급', text: '어머 자기야~ 내가 이 얘기 안 하려고 했는데, 애 취급 당하면 네가 미니 헤어핀 돼.', animation: 'SHOCKWAVE' },
    ],
    daeri: [
      { label: '야근염색', text: '어머 자기야~ 또 야근이야? 네 머리도 주말엔 쉬고 싶겠다.', animation: 'PSYCHIC' },
      { label: '월급샴푸', text: '월급 얘기만 나오면 네 표정이 샴푸거품처럼 사라지네.', animation: 'PROJECTILE' },
      { label: '퇴근카톡', text: '부장님 퇴근 직전 카톡 한 통에 네 한숨이 드라이기처럼 나오네.', animation: 'SHOCKWAVE' },
      { label: '열정컷', text: '열정 부족 소리 들으면 네 어깨가 볼륨 빠진 헤어처럼 처지네.', animation: 'DASH' },
    ],
    alba: [
      { label: '할인샷', text: '어머 자기야~ 네 시급, 내 염색약 할인권 수준이더라.', animation: 'PSYCHIC' },
      { label: '학생기록', text: '웃겨, \'학생\'이라 부르는 손님은 내 비밀노트에 저장돼 있어.', animation: 'PROJECTILE' },
      { label: '유통기록', text: '그 폐기 도시락, 네 근무연수보다 유통기한이 길다.', animation: 'SHOCKWAVE' },
      { label: '야간스탬프', text: '밤에 \'잠 안 자냐\' 소리 들으면 네게 야간스탬프 찍어줄게.', animation: 'DASH' },
    ],
    chongmu: [
      { label: '읽씹볼륨', text: '어머 자기야~ 단톡 읽씹하면서 머리만 볼륨 있네.', animation: 'PSYCHIC' },
      { label: '회비정리', text: '회비 미납이야? 네 정리력은 파마보다 엉성하네.', animation: 'SHOCKWAVE' },
      { label: '올드컷', text: '젊은 애들 안 온다며? 단톡 말투가 완전 올드컷이네.', animation: 'DASH' },
      { label: '카톡폭격', text: '네 카톡이 머리숱처럼 쌓여서 다들 \'총무님 카톡 좀 그만\' 한단다.', animation: 'PROJECTILE' },
    ],
  },
}
