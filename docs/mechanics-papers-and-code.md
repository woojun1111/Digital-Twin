# 엔진 역학 구현: 논문과 공개 코드 조사

조사일 2026-11-16. 목적은 일반 가스터빈/회전체/유동/열전달 학습 모듈의 근거를 확보하는 것입니다. 공개 엔진 모델을 F414의 성능 모델로 간주하지 않습니다. 이번에는 논문·서지·저장소·예제 경로·라이선스를 조사했으며 코드를 설치 실행하거나 결과를 재현하지 않았습니다.

## 1. 열역학 사이클: pyCycle — 우선 검토

- Hendricks, E. S.; Gray, J. S. (2019). **pyCycle: A Tool for Efficient Optimization of Gas Turbine Engine Cycles**. Aerospace 6(8), 87. DOI [10.3390/aerospace6080087](https://doi.org/10.3390/aerospace6080087).
- [공개 원문](https://www.mdpi.com/2226-4310/6/8/87)
- [공식 코드](https://github.com/OpenMDAO/pyCycle)
- [예제 디렉터리](https://github.com/OpenMDAO/pyCycle/tree/master/example_cycles): `high_bypass_turbofan.py`, `single_spool_turboshaft.py` 등 존재 확인.
- [구성품 코드](https://github.com/OpenMDAO/pyCycle/tree/master/pycycle/elements): 압축기·연소기·터빈·노즐, 테스트 및 회귀 데이터.
- 언어/환경: Python + OpenMDAO. README가 지시하는 설치 패키지는 `om-pycycle`이며 다른 이름의 PyPI 패키지와 구분해야 합니다.
- 라이선스: 저장소 `LICENSE.txt`에서 Apache-2.0 직접 확인. API 메타데이터의 NOASSERTION은 라이선스 부재를 뜻하지 않았습니다.
- 열람: 공개 논문 초록·개요 및 코드 가용성 부분, README와 예제/검사 파일 목록.
- 도움: 정상상태 구성품 연결, 에너지/질량 유량 매칭, 전체 사이클의 온도·압력·일량 표현.
- 한계: 주된 용도는 사이클 해석입니다. 자체적으로 시간에 따른 축 가속, 구조 진동, 3D CFD를 모두 해결하지 않습니다. 논문의 NPSS 비교 오차는 해당 기준 모델 결과이지 현재 앱 또는 실제 F414의 오차가 아닙니다.

## 2. 엔진 과도응답: NASA T-MATS — 검증 방법 참고

- Zinnecker, A. M.; Chapman, J. W.; Lavelle, T. M.; Litt, J. S. (2014). **Development of a Twin-Spool Turbofan Engine Simulation Using the Toolbox for the Modeling and Analysis of Thermodynamic Systems (T-MATS)**. NASA/TM-2014-218402.
- [공개 보고서 서지·원문](https://ntrs.nasa.gov/citations/20150000858)
- [공식 코드](https://github.com/nasa/T-MATS)
- [예제 선택 스크립트](https://github.com/nasa/T-MATS/blob/master/Trunk/TMATS_Examples/TMATS_Run_Example.m): 일반 가스터빈·JT9D 정상상태/동적 예제와 선형화 예제를 확인할 수 있습니다.
- [사용자 가이드](https://ntrs.nasa.gov/citations/20140012486), NASA/TM-2014-216638.
- 환경: MATLAB/Simulink, 일부 C/MEX. 코드 Apache-2.0; MATLAB/Simulink 사용권과 별개.
- 열람: NTRS 초록·서지와 저장소 예제 안내. 보고서 전체 수식과 실험을 재현한 단계는 아닙니다.
- 도움: 구성품 맵·수치 솔버·축/액추에이터 동특성을 분리하고 정상상태 초기화 후 과도응답을 검증하는 방법.
- 한계: 프레임워크가 공개라는 사실은 F414의 맵·관성·제어기가 공개라는 뜻이 아닙니다. 기존의 지연 애니메이션에 논문을 인용한다고 실제 물리 모델이 되지는 않습니다.

## 3. 공개 엔진 전체 모델: AGTF30 — 데이터와 모델 연결 참고

- Chapman, J. W.; Litt, J. S. (2017). **Control Design for an Advanced Geared Turbofan Engine**. NASA/TM-2017-219569 / AIAA 2017-4820.
- [공개 보고서](https://ntrs.nasa.gov/citations/20170011210)
- Jones, S. M.; Haller, W. J.; Tong, M. T. (2017). **An N+3 Technology Level Reference Propulsion System**. NASA/TM-2017-219501. [공개 보고서](https://ntrs.nasa.gov/citations/20170005426).
- [공식 코드](https://github.com/nasa/AGTF30)
- `AGTF30/setup_everything.m` 설정 후 `AGTF30SysDyn.mdl`, `AGTF30SysSS.mdl`, `AGTF30SysLin.mdl`을 사용하는 흐름을 README에서 확인했습니다.
- 환경: MATLAB/Simulink + T-MATS. 개발 당시 버전과 최신 버전의 호환성은 실행 검증 필요. Apache-2.0.
- 도움: 독립적으로 재현할 수 있는 개념 민항용 기어드 터보팬 모델을 기준으로 삼는 데 유용. 공개 기준 사이클, 설정, 출력의 연결을 학습할 수 있습니다.
- 한계: F414와 구조/용도가 다릅니다. F414 외형 뒤에서 계산한 뒤 실제 F414 예측이라고 표시해서는 안 됩니다.
- 참고 확장: [AGTF30-e 코드](https://github.com/nasa/AGTF30-e), [2024 NASA 기술 발표](https://ntrs.nasa.gov/citations/20240008896). 전동화 연구용 가상 시험대 자료이며 해당 NTRS 항목은 학술지 논문이 아니라 Presentation으로 분류됩니다.

## 4. 반응·물성·열전달: Cantera — Python 연결에 적합

- Goodwin et al. **Cantera: An Object-oriented Software Toolkit for Chemical Kinetics, Thermodynamics, and Transport Processes**, v3.2.0 (2025), [DOI 10.5281/zenodo.17620923](https://doi.org/10.5281/zenodo.17620923).
- 이 항목은 학술지 논문이 아니라 버전이 고정된 소프트웨어 인용입니다. [공식 인용 안내](https://cantera.org/citations.html).
- [공식 코드](https://github.com/Cantera/cantera), Python/C++ 인터페이스, BSD 3-Clause 조건을 `License.txt`에서 확인.
- [시간 적분 설명](https://cantera.org/stable/userguide/reactor-tutorial.html)
- [벽 열전달 코드](https://github.com/Cantera/cantera/blob/main/samples/python/reactors/reactor2.py)
- [연소기 예제 코드](https://github.com/Cantera/cantera/blob/main/samples/python/reactors/combustor.py)
- 도움: 임의의 색 변화에 머무르지 않고 물성·상태방정식·에너지 방정식을 갖춘 작은 반응기/열전달 예제를 먼저 재현할 수 있습니다.
- 한계: 화학반응 메커니즘은 별도 물리 모델입니다. 예제 연료와 메커니즘을 실제 엔진 연료에 바로 적용할 수 없으며, 0D/1D 예제가 전체 엔진의 난류 연소를 검증하는 것은 아닙니다.

## 5. 유체역학/CFD: SU2 — 기준 문제와 결과장 시각화

- Palacios et al. (2013). **Stanford University Unstructured (SU2): An Open-Source Integrated Computational Environment for Multi-Physics Simulation and Design**. AIAA 2013-0287. [DOI 10.2514/6.2013-287](https://doi.org/10.2514/6.2013-287).
- [저자 측 공개 PDF](https://su2code.github.io/documents/SU2_AIAA_ASM2013.pdf)
- [공식 코드](https://github.com/su2code/SU2), [공식 튜토리얼 코드/격자](https://github.com/su2code/Tutorials)
- 언어: C++ 중심, Python 도구. 코어 저장소 라이선스 파일은 LGPL 2.1 본문을 포함하며 실제 채택 버전의 헤더·번들 의존성까지 확인해야 합니다.
- 구체적 재현 사례: [NICFD nozzle](https://su2code.github.io/tutorials/NICFD_nozzle/), [격자·설정·experimental_data.dat](https://github.com/su2code/Tutorials/tree/master/compressible_flow/NICFD_nozzle).
- 논문 연결: 튜토리얼이 Spinelli et al. (2018), **Experimental evidence of non-ideal compressible effects in expanding flow of a high molecular complexity vapor**, Experiments in Fluids 59:126을 실험 비교 출처로 제시합니다.
- 열람: SU2 논문 초록/구조·검증 설명, 공식 노즐 튜토리얼 본문과 공개 파일 목록.
- 도움: 압력·속도·Mach를 실제 해석 결과장에서 읽어 화면에 표시하는 파이프라인. 격자/시간 수렴과 실험 비교 방법 참고.
- 한계: 위 노즐 예제는 비이상 유기증기 문제로 F414 또는 로켓 배기가스가 아닙니다. 초보 기준 문제로는 더 단순한 NASA CDV가 우선입니다. 전체 엔진 CFD의 브라우저 실시간 실행은 별도의 큰 계산 문제입니다.

## 6. 회전체 구조 동역학: ROSS — 진동 모듈로 분리

- Timbó et al. (2020). **ROSS – Rotordynamic Open Source Software**. JOSS 5(48), 2120. [DOI 10.21105/joss.02120](https://doi.org/10.21105/joss.02120).
- [논문과 소프트웨어 심사/아카이브 링크](https://joss.theoj.org/papers/10.21105/joss.02120)
- [공식 코드](https://github.com/petrobras/ross), [문서](https://ross.readthedocs.io/en/stable/)
- Python, 코드 Apache-2.0. 논문 CC BY 4.0과 코드 라이선스는 별개입니다.
- 열람: 공개 5쪽 논문 본문과 공식 문서 목차, 저장소 예제 관련 파일 목록.
- 원리: Timoshenko 보 축요소, 디스크, 베어링을 조립하는 유한요소 모델. 질량·강성·감쇠·자이로 효과를 반영.
- 도움: Campbell diagram, 고유진동수, 불평형 응답, 축 궤적을 계산해 회전체 모듈에 표시할 수 있습니다.
- 한계: 축이 휘거나 진동하는 문제와 터빈/압축기 토크 차이로 회전수가 가속하는 문제는 다릅니다. 회전 관성에 따른 가속·감속은 가스터빈 상태 모델과 별도로 결합해야 합니다. 실제 치수·재료·베어링 계수가 없으면 실제 엔진 진동 예측은 불가합니다.

## 7. 추가 열전달 후보: OpenFOAM CHT

- [공식 소스 설명](https://cpp.openfoam.org/v10/chtMultiRegionFoam_8C.html): 유체와 고체의 열전달 결합 기능.
- OpenCFD v2312 문서 URL은 이번 열람에서 403 오류가 발생했습니다. 따라서 전체 튜토리얼 파일을 확보·재현했다고 주장하지 않습니다.
- OpenFOAM Foundation과 OpenCFD 배포판의 버전/솔버/튜토리얼 경로가 다를 수 있어 실제 도입 시 배포판 고정이 필요합니다.
- 도움: 벽 온도장을 다루는 오프라인 고급 모듈 후보. 처음부터 전체 엔진 반응유동·냉각·구조를 결합하는 것은 범위가 큽니다.

## 8. 가장 먼저 쓸 수 있는 독립 검증 기준

[NASA NPARC CDV Nozzle](https://www.grc.nasa.gov/www/wind/valid/cdv/cdv.html): 비점성·비열전도 수축확대 노즐의 해석해, 질량 보존, 등엔트로피 구간 전압력 보존을 비교하는 공개 기준입니다. 정성적 화염 효과를 검증된 CFD로 바꾸는 첫 단계에 적합합니다. 실제 엔진 성능 검증과는 구분합니다.

## 프로젝트 권고

- Python 기반 우선 경로: pyCycle(정상상태) + Cantera(물성·반응기/열 학습) + ROSS(독립 진동 모듈).
- 동특성 기준 연구: MATLAB/Simulink 사용 가능 시 T-MATS/AGTF30의 일반 엔진 예제를 먼저 재현. MATLAB 없이 곧바로 실행 가능하다고 안내하지 않습니다.
- 유동장: 단순 기준 해석 → SU2 등으로 오프라인 검증 → 결과 파일을 브라우저에 표시. 프런트엔드 프레임률과 물리 솔버 시간 간격을 분리합니다.
- 결합 방식: 처음부터 모든 솔버를 실시간으로 연결하기보다, 각 예제의 입력·단위·출력·오차를 확인한 후 상태 인터페이스를 설계합니다.
- 최소 산출물: 버전/커밋 고정, 원 출처/라이선스, 재현 입력, 기준값, 오차 표, 수렴 결과, 단위와 가정.

어느 자료도 현재 F414 외형 시뮬레이터의 정확도를 자동 보증하지 않습니다. 이번 변경은 문헌·코드 조사이며 계산 모델 교체는 수행하지 않았습니다.
