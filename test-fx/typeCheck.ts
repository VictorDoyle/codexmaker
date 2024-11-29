
function getData() {
  console.log('testing analysis of getData code');
}


function validateData(data: void) {
  console.log('testing analysis of validateData code');
}


function transformData(data: void) {
  console.log('testing analysis of transformData code');
}


function processData() {
  const data = getData();
  validateData(data);
  return transformData(data);
}