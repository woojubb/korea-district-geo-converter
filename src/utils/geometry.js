const turf = require("@turf/turf");
const proj4 = require("proj4");
const fs = require("fs");
const path = require("path");

// EPSG:5186 좌표계 정의
proj4.defs(
  "EPSG:5186",
  "+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs"
);

function isClockwise(coords) {
  let sum = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    let p1 = coords[i],
      p2 = coords[i + 1];
    sum += (p2[0] - p1[0]) * (p2[1] + p1[1]);
  }
  return sum > 0;
}

function simplifyGeometry(
  geoJson,
  precision = 6,
  tolerance = 0.001,
  debug = false
) {
  const fromProjection = "EPSG:5186";
  const toProjection = "EPSG:4326";

  function roundCoord(coord) {
    return coord.map((val) => Number(val.toFixed(precision)));
  }

  function transformAndRoundCoord(coord) {
    try {
      const transformed = proj4(fromProjection, toProjection, coord);
      if (debug) console.log(`Original: ${coord}, Transformed: ${transformed}`);
      return roundCoord(transformed);
    } catch (error) {
      // console.log(`Error transforming coordinate ${coord}: ${error.message}`);
      throw error;
      // return coord;
    }
  }

  function simplifyAndTransform(geometry) {
    if (debug) console.log("Input geometry:", JSON.stringify(geometry));

    // 먼저 좌표계 변환
    const transformedGeometry = {
      type: geometry.type,
      coordinates:
        geometry.type === "Polygon"
          ? geometry.coordinates.map((ring) => ring.map(transformAndRoundCoord))
          : geometry.coordinates.map((polygon) =>
              polygon.map((ring) => ring.map(transformAndRoundCoord))
            ),
    };

    if (debug)
      console.log("Transformed geometry:", JSON.stringify(transformedGeometry));

    // 그 다음 단순화 적용
    try {
      const simplified = turf.simplify(turf.feature(transformedGeometry), {
        tolerance: tolerance,
        highQuality: false,
      });

      if (debug)
        console.log(
          "Simplified geometry:",
          JSON.stringify(simplified.geometry)
        );

      return simplified.geometry;
    } catch (error) {
      // console.error(`Error simplifying geometry: ${error.message}`);
      throw error;
      // return transformedGeometry;
    }
  }

  if (geoJson.type === "Polygon" || geoJson.type === "MultiPolygon") {
    return simplifyAndTransform(geoJson);
  } else {
    throw new Error(
      "지원되지 않는 타입입니다. Polygon 또는 MultiPolygon 타입만 지원됩니다."
    );
  }
}

function fixPolygonOrientation(geometry) {
  if (geometry.type === "Polygon") {
    return fixSinglePolygonOrientation(geometry);
  } else if (geometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geometry.coordinates.map(
        (poly) =>
          fixSinglePolygonOrientation({ type: "Polygon", coordinates: poly })
            .coordinates
      ),
    };
  } else {
    throw new Error("Geometry must be Polygon or MultiPolygon");
  }
}

function fixSinglePolygonOrientation(polygon) {
  const exteriorRing = polygon.coordinates[0];
  const interiorRings = polygon.coordinates.slice(1);

  // 외부 링이 시계 방향이면 반전
  if (turf.booleanClockwise(exteriorRing)) {
    exteriorRing.reverse();
  }

  // 내부 링(구멍)이 반시계 방향이면 반전
  const fixedInteriorRings = interiorRings.map((ring) => {
    return turf.booleanClockwise(ring) ? ring : ring.reverse();
  });

  return {
    type: "Polygon",
    coordinates: [exteriorRing, ...fixedInteriorRings],
  };
}

function multiPolygonToPolygons(feature) {
  if (feature.geometry.type === "MultiPolygon") {
    return feature.geometry.coordinates.map((polygonCoords, index) => ({
      type: "Feature",
      properties: {
        ...feature.properties,
        originalMultiPolygonIndex: index,
      },
      geometry: {
        type: "Polygon",
        coordinates: polygonCoords,
      },
    }));
  }
  return [feature];
}

function combineGeoJSONFiles(inputDir, outputFile) {
  try {
    // 결과 FeatureCollection 초기화
    const combinedGeoJSON = {
      type: "FeatureCollection",
      features: [],
    };

    // 입력 디렉토리의 모든 파일 읽기
    const files = fs.readdirSync(inputDir);

    // 각 JSON 파일 처리
    for (const file of files) {
      if (path.extname(file).toLowerCase() === ".json") {
        const filePath = path.join(inputDir, file);
        const fileContent = fs.readFileSync(filePath, "utf8");
        const jsonData = JSON.parse(fileContent);

        // 단일 Feature인 경우
        if (jsonData.type === "Feature") {
          combinedGeoJSON.features.push(jsonData);
        }
        // FeatureCollection인 경우
        else if (jsonData.type === "FeatureCollection") {
          combinedGeoJSON.features.push(...jsonData.features);
        }
        // 그 외의 경우 (에러 처리 또는 무시)
        else {
          console.warn(`Skipping file ${file}: Unrecognized JSON structure`);
        }
      }
    }

    // 결과 파일 쓰기
    fs.writeFileSync(outputFile, JSON.stringify(combinedGeoJSON), "utf-8");
    console.log(`Combined GeoJSON file created: ${outputFile}`);
  } catch (error) {
    console.error("Error combining GeoJSON files:", error);
  }
}

module.exports = {
  simplifyGeometry,
  fixPolygonOrientation,
  combineGeoJSONFiles,
  multiPolygonToPolygons,
};
