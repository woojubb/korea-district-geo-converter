# 한국 행정구역 지리정보 변환기

## 설명

- 한국 행정구역 지리정보를 GeoJSON 형식으로 변환하는 프로그램입니다.
- 현재는 시군구 단위의 행정구역 지리정보만 변환할 수 있습니다.
- 행정동경계 정보는 별도로 제공되는 행정동경계 정보를 사용합니다.
  - [디지털트윈국토](https://www.vworld.kr/dtmk/dtmk_ntads_s002.do?svcCde=MK&dsId=30017)에서 행정동경계 정보를 다운로드 받을 수 있습니다.

## 사용법

1. 행정동경계 데이터 다운로드
2. `BND_ADM_DONG_PG.zip` 파일을 압축 해제 및 `./input` 폴더에 넣기
3. `센서스 공간정보 지역 코드.xlsx` 파일을 `./input` 폴더에 넣기
4. 프로그램 실행

```shell
npm install
npm start
```

## 참고

- 변환 완료된 파일은 `./dist` 폴더에 저장됩니다.
- [https://www.npmjs.com/package/browser-reverse-geocoder](browser-reverse-geocoder)를 이용해 브라우저에서 GPS좌표를 주소로 변환할 수 있습니다.
