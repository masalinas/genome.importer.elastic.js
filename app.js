const fs = require('fs');
const csv = require('csv-parser');
const { Client } = require('@elastic/elasticsearch')

const PATH_DATA = './downloaded_data';

// connect to elasticsearch db
const client = new Client({node: 'http://localhost:9200'});

// callback API
async function index(dataset) {
  const body = dataset.flatMap(doc => [{ index: { _index: 'dataset' } }, doc]);

  const { body: bulkResponse } = await client.bulk({ refresh: true, body });

  if (bulkResponse.errors) {
    const erroredDocuments = [];

    // The items array has the same order of the dataset we just indexed.
    // The presence of the `error` key indicates that the operation
    // that we did for the document has failed.
    bulkResponse.items.forEach((action, i) => {
      const operation = Object.keys(action)[0];
      
      if (action[operation].error) {
        erroredDocuments.push({
          // If the status is 429 it means that you can retry the document,
          // otherwise it's very likely a mapping error, and you should
          // fix the document before to try it again.
          status: action[operation].status,
          error: action[operation].error,
          operation: body[i * 2],
          document: body[i * 2 + 1]
        })
      }
    });

    console.log(erroredDocuments);
  }
  
  return body;
}

// STEP-001: get all dataset samples files
fs.readdir(PATH_DATA, function (err, files) {
  if (err) {
    return console.log('Unable to scan directory: ' + err);
  } 
  
  getFiles(files).then(() => {
    //mongoose.connection.close(); 

    console.log('Import finalized');    
  });    
})

const getFiles = async (files) => {
  for (const file of files) {
    const result = await parser(file);

    console.log(result);    
  };
};

const parser = (file) => {
  return new Promise((resolve, reject) => {
    // STEP-002: read samples file and parse to json
    var fileName = file.split('.')[0];    
    var cancerCode = fileName.split('_')[0];
    var fileType = fileName.split('_')[1];
      
    let dataType;
    if (fileType !== undefined) {
      if (fileType.includes('RNA')) {      
        dataType = 'rna';
      }
      else {
        dataType = 'gene';
      }
    }
      
    let results = [];  
    let dataset = [];
    
    var s = fs.createReadStream(PATH_DATA + '/' + file, 'utf8')
      .pipe(csv({ separator: '\t' }))
      .on('error', (err) => {
        console.log('Error while reading file.', err);
      })    
      .on("data", (row) => {
        results.push(row);
      })
      .on("end", () => {
        if (results.length > 0) {
          // STEP-003: initialize patient samples dataset from first sample
          const keys = Object.keys(results[0]);

          for (let i = 1; i < keys.length; i++) {
            sample = {};
            sample['sampleName'] = keys[i];
            sample['sampleType'] = dataType;
            sample['cancerCode'] = cancerCode;
            sample['measures'] = [];

            dataset.push(sample);
          }
        
          // STEP-004: add sample details (expresion genes and miRNAs) for each patient sample dataset
          for (let i = 0; i < results.length; i++) {          
            for (let j = 0; j < dataset.length; j++) {
              if (!results[i]['sample'].includes('?')) {
                if (results[i][dataset[j]['sampleName']] !== 'NA')
                  dataset[j]['measures'].push({ 'key': results[i]['sample'], 'value': parseFloat(results[i][dataset[j]['sampleName']]) });                
                else
                  dataset[j]['measures'].push({ 'key': results[i]['sample'], 'value': results[i][dataset[j]['sampleName']] });                
              }
            }
          }

          // STEP-005: save dataset in database 
          index(dataset)
            .then(result => {
              resolve("Dataset for file " + file + " inserted");
            })
            .catch(error => {
              reject("Dataset for file " + file + " with error: " + error);  
            })
            .finally(() => {
              console.log("Elastic query done ...");
            });
        }                                         
      });  
    });
}