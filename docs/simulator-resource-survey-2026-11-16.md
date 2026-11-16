# 시뮬레이터 확장 자료 조사

조사일: 2026-11-16. 공식·제작자 웹 본문 및 문서의 열람 조사입니다. 앱 실행, 소스 감사, 정확도 재검증 또는 유료 자산 다운로드를 수행했다는 의미가 아닙니다. 사이트 인지도 순위를 조사한 것은 아닙니다.

## UI와 상호작용 참고

| 자료 | 열람에서 확인한 내용 | 적용 후보 / 한계 |
|---|---|---|
| [MySimulator 로켓 엔진](https://www.mysimulator.uk/aerospace/rocket-engine/) | 시뮬레이터 분류, 독립 실행, 전체 화면, 슬라이더, Three.js/WebGL 안내 | 여러 모듈을 탐색하는 허브 참고. 계산 정확도와 검증 이력은 이번 조사에서 확인하지 않음 |
| [Meco](https://www.mecorocketsimulator.com/) | 제작자 설명: 부품 노드 연결, 실시간 그래프와 3D, Steam Early Access | 구성요소와 결과를 연결하는 UX 참고. 웹 계산 도구가 아니라 데스크톱 제품 소개 사이트. 물리 정확도는 제작자 주장으로 독립 검증하지 않음 |
| [Jack Nelson 노즐·플룸](https://jackanelson.com/nozzle/) | 제작자가 설명한 축대칭 Euler 솔버, 밀도·압력·Mach·Schlieren 보기, 프리셋 | 물리장 색상과 프리셋 참고. 제작자가 정성적 데모이며 검증된 설계 도구가 아니라고 명시 |
| [NASA Glenn 시뮬레이터 모음](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/bga-simulations/) | 엔진·노즐 등 개념별 교육용 모듈 | 모듈화와 원리 설명 참고. 개별 구형 Java 페이지와 현대화 페이지를 구분해야 함 |

타 사이트의 코드·이미지·레이아웃을 사용 허가 없이 복제하지 않습니다. 자체 UI 설계의 참고자료입니다.

## 계산 기반

1. [NASA T-MATS](https://github.com/nasa/T-MATS): 일반 가스터빈 정상상태·동특성 모델링. MATLAB/Simulink 기반, Apache-2.0 안내 확인. F414 전용 데이터가 아니며 브라우저에 즉시 삽입하는 라이브러리도 아닙니다.
2. [NASA CEA 공식 문서](https://nasa.github.io/cea/): 화학평형, 열역학·수송물성, 공개 예제. 교육용 열역학 기준 계산 후보. 반응속도·전체 엔진 동특성을 단독으로 해결하지 않습니다. 특정 버전을 고정하고 설치·예제 재현·라이선스 파일 확인 후 채택해야 합니다.
3. [Cantera 시간 적분 튜토리얼](https://cantera.org/stable/userguide/reactor-tutorial.html): 반응기 상태의 시간 적분, 허용오차, 입출구, 벽 열전달 예제. 단순 열/반응기 학습 모듈 후보. 예제의 메커니즘을 실제 엔진 연료에 검증 없이 적용하지 않습니다.
4. [RocketPy 문서](https://docs.rocketpy.org/en/latest/index.html): 고출력 모형 로켓의 6자유도 비행, 가변 질량, 낙하산, 바람 데이터. 이후 모형 로켓 비행 교육 모듈 후보. 발사체 전체 추진기관·구조·궤도를 자동으로 해결하는 도구로 해석하지 않습니다.
5. [OpenRocket 기술 문서](https://openrocket.info/documentation.html): 모형 로켓 모델링 이론과 실험자료 연결. 문서 CC BY-SA, 원 학위논문 CC BY-NC-ND로 서로 다릅니다. 소프트웨어와 자료의 라이선스는 각각 확인해야 합니다.

## 검증 자료

[NASA NPARC CDV Nozzle](https://www.grc.nasa.gov/www/wind/valid/cdv/cdv.html): 비점성·비열전도 수축확대 노즐의 정상 유동. 아음속 등엔트로피, 정상 충격파 포함, 초음속 등엔트로피 사례가 제시됩니다. 해석해와 비교, 질량 보존, 등엔트로피 구간 전압력 보존을 확인하는 기준입니다. 반응성 고온 플룸·열전달 검증을 대신하지 않습니다.

[NASA Seiner heated jet](https://www.grc.nasa.gov/www/wind/valid/seiner/Seiner.html): 가열 분출 유동 검증 사례 후보. 이번에는 안내 수준을 확인했으며 격자·경계조건·실험값을 내려받아 재현하지 않았습니다.

[NASA C-MAPSS 안내](https://data.nasa.gov/dataset/c-mapss-aircraft-engine-simulator-data): 해당 페이지는 C-MAPSS/C-MAPSS40k 소프트웨어 다운로드가 현재 불가하다고 안내합니다. 모든 C-MAPSS 파생 데이터셋이 불가하다는 뜻은 아닙니다. 공개 다운로드를 당연히 이용 가능하다고 가정하지 않고, 수명 예측 데이터와 동적 솔버를 구분해야 합니다. 어느 경우에도 F414 데이터는 아닙니다.

## 형상 자료

- [GE F414 공식 데이터시트](https://www.geaerospace.com/sites/default/files/2023-12/F414-Datasheet.pdf): 외형 치수와 제원 참고. 제작 CAD나 내부 성능 맵을 제공하지 않습니다.
- [MTU F414](https://www.mtu.de/engines/military-aircraft-engines/fighter-aircraft/f414/): 두 축·후연소·수축확대 노즐 구성 참고.
- [NASA 3D Resources](https://science.nasa.gov/3d-resources/): 우주기체·미션 자산 검색 출발점. F414의 정밀 내부 CAD를 확보한 것은 아닙니다. 개별 자산 설명과 재사용 조건을 확인해야 합니다.
- [Free3D General Electric F414](https://free3d.com/3d-model/general-electric-f414-8610.html): OBJ/BLEND/FBX/STL 판매 목록 확인. 페이지는 리깅·애니메이션 없음, Editorial Only 조건을 표시합니다. 실제 파일을 받지 않아 내부 부품 분리와 기하 정확도를 확인하지 못했습니다. 비용 결제·다운로드·재배포 권한 확인 없이 채택하지 않습니다.

## 채택 판단과 다음 구현 순서

UI는 독립된 실험 카드/모듈 메뉴, 중앙 시각화, 입력과 결과의 일관된 배치, 단위·적용 범위·검증 상태를 포함하도록 구성합니다. MySimulator의 폭넓은 카탈로그와 Meco의 부품-그래프 연결 방식을 자체 디자인으로 해석합니다.

1. 가장 작은 독립 물리 모듈로 NASA 노즐 기준 사례를 재현하고 해석해 오차·보존식·격자/시간 수렴 결과를 기록합니다.
2. 그 검증된 교육용 모듈에 압력/Mach 표시와 설명을 연결합니다. 검증 전의 입자 효과를 CFD 결과로 표시하지 않습니다.
3. 별도 열 응답 학습 모듈에 Cantera 예제를 적합성 검토 후 도입합니다.
4. 일반 가스터빈은 T-MATS 자료를 학습/비교 기준으로 검토합니다. F414 실기 정확도를 주장하지 않습니다.
5. 모형 로켓 비행은 RocketPy/OpenRocket의 공개 예제를 먼저 재현하고, 실제 발사체 모델과 구분합니다.

현재 앱에 위 계산기를 통합하거나 이번 조사만으로 검증을 완료한 것은 아닙니다. 이번 변경은 자료 조사 및 후보 선정 문서 추가입니다.
