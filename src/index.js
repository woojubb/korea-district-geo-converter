const shapefile = require('shapefile');
const fs = require('fs');
const { xlsxToJson } = require('./utils/xlsx');

const { simplifyGeometry, fixPolygonOrientation, combineGeoJSONFiles } = require('./utils/geometry');


// Shapefile 경로 설정
const shapefilePath = './input/BND_ADM_DONG_PG.shp';
const dbfFilePath = './input/BND_ADM_DONG_PG.dbf';

if (!fs.existsSync('./.temp')) {
    fs.mkdirSync('./.temp', { recursive: true });
}

if (!fs.existsSync('./dist')) {
    fs.mkdirSync('./dist', { recursive: true });
}

const xlsxData = xlsxToJson('./input/센서스 공간정보 지역 코드.xlsx');

const codeMap = xlsxData.reduce((acc, data, index) => {
    if (index < 2) return acc;

    const [provinceCode, provinceName, districtCode, districtName, townCode, townName] = data;
    const code = `${provinceCode}${districtCode}${townCode}`;

    acc[code] = {
        provinceCode,
        provinceName,
        districtCode,
        districtName,
        townCode,
        townName,
        code,
    };

    return acc;
}, {});

// console.log(codeMap);

// Shapefile을 읽어 GeoJSON 형식으로 변환
shapefile.open(shapefilePath, dbfFilePath, { encoding: 'euc-kr'} )
    .then(source => source.read()
        .then(function log(result) {
            if (!result) {
              return;
            }
            if (result.done) return;

            // console.log("result", result);
            
            // 각 feature의 properties와 geometry를 포함하는 객체 생성
            // const features = result.value.map(feature => ({
            //    properties: feature.properties,
            //     geometry: feature.geometry
            // }));

            let geometry = null;
            try {
                geometry = simplifyGeometry(result.value.geometry);
            } catch(e) {
                console.log(`unknown error(1)`, e);
                try {
                    const fixedGeometry = fixPolygonOrientation(result.value.geometry);
                    console.log(`fixedGeometry`, fixedGeometry);
                    geometry = simplifyGeometry(fixedGeometry);
                } catch(e2) {
                    console.log(`unknown error(2)`, e2);
                    geometry = result.value.geometry;
                }
            }

            const newData = {
              ...result.value,
              geometry,
              properties: {
                ...result.value.properties,
                ...codeMap[result.value.properties.ADM_CD],
              }
            };

            const filename = `${result.value.properties.ADM_NM}-${result.value.properties.ADM_CD}.json`;

            // GeoJSON 형식으로 변환된 데이터를 JSON으로 저장
            const outputFilePath = `./.temp/${filename}`;
            fs.writeFileSync(outputFilePath, JSON.stringify(newData), 'utf-8');
            
            // console.log('GeoJSON 데이터가 성공적으로 변환되고 저장되었습니다.');
            
            return source.read().then(log);
        }))
    .then(() => combineGeoJSONFiles('./.temp', './dist/districts.kr.json'))
    .catch(error => console.error(error.stack));
