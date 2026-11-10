# 조사 기록 · 2026-11-10

공개 NASA 자료와 논문을 먼저 검토했습니다. DBpia 로그인 자료는 아직 사용하지 않았습니다. 이 문서는 읽은 범위와 구현 가정을 구분합니다.

## 1. NASA Glenn — Engine Thrust Equations

https://www.grc.nasa.gov/WWW/k-12/airplane/thsum.html

열람 범위: 웹 본문. 입구 상태, 노즐 팽창, 연료를 포함한 운동량 추력의 계산 연결을 확인했습니다. `engine.py`의 온도·압력·추력 계산 구성에 참고했습니다. 이 자료가 우리 프로젝트의 운전별 압력비·유량 스케줄이나 숫자 정확도를 보증하지는 않습니다.

## 2. NASA Glenn — Turbofan Thrust

https://www.grc.nasa.gov/www/k-12/airplane/turbfan.html

열람 범위: 웹 본문. 코어와 바이패스 유동, 바이패스비, 두 유동의 추력 합산을 확인했습니다. 구현에서는 팬이 전체 공기를 처리하며 코어와 바이패스 배기 추력을 별도로 합산합니다. 3D 형상은 프로젝트에서 만든 개념도입니다.

## 3. Glaessgen & Stargel (2012)

The Digital Twin Paradigm for Future NASA and U.S. Air Force Vehicles. AIAA 2012-1818.

- 서지: https://ntrs.nasa.gov/citations/20120008178
- 공개 원문: https://ntrs.nasa.gov/api/citations/20120008178/downloads/20120008178.pdf

열람 범위: 서지·초록과 원문 서론/개념 설명. 물리 모델, 개체별 상태 및 운용 이력을 연결한다는 방향을 참고했습니다. 엔진 성능 식이나 학습 모델을 제공하는 논문은 아닙니다. 현재 v0.1은 가상 시뮬레이터이며, 개체별 관측 동기화와 상태 추정이 추가되어야 프로젝트의 디지털트윈 목표에 가까워집니다.

## 4. NASA PCoE — Turbofan Engine Degradation Simulation Data Set

https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/

열람 범위: 공식 데이터 저장소 안내. C-MAPSS는 시뮬레이션 기반 데이터입니다. 이번 코드에는 데이터 파일을 내려받거나 RUL 모델을 학습하지 않았습니다. 다음 단계에서 FD001 배포본 readme와 생성 논문을 확인하고 변수·단위·분할 규칙을 고정해야 합니다.

## 후속 조사 항목

- Saxena et al. (2008), Damage Propagation Modeling for Aircraft Engine Run-to-Failure Simulation: 원문을 검토해 열화 매개변수와 관측 관계 정리.
- FD001 기준선: 엔진 단위 검증 분리, 훈련 집합에만 전처리 적합, 마지막 관측 시점 RUL 평가, RMSE/MAE 기록.
- 물리 기반 과도 모델: 부품 맵·두 축 관성·제어기·노즐 유량 매칭을 갖춘 공개 모델 후보 검토.
- 모든 후속 연구는 출처, 열람 범위, 식/데이터, 적용 조건, 한계, 코드 반영 위치를 기록.

**연결 원칙:** 현재 개념 엔진 출력과 C-MAPSS 센서를 같은 엔진의 측정값처럼 혼합하지 않습니다. 단위·관측 위치·운전 조건의 대응을 검증한 뒤 상태 추정에 사용합니다. 데이터 재생의 운전 사이클을 임의로 초 단위로 환산하지 않습니다.
