const XLSX = require('xlsx');

function xlsxToJson(filePath) {
  // Read the file
  const workbook = XLSX.readFile(filePath);

  // Get the first sheet
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to JSON
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  return jsonData;
}

module.exports = {
  xlsxToJson
};
