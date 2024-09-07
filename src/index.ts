import fs from 'fs';
import path from 'path';
import {
  processAllDocumentsFromBaseDirectory,
  processPdfToImagesToJson,
} from './processes';

// Set the datasheets folder path
export const datasheetsFolderPath = './node_modules/fet-datasheets';

// Call processDocuments on all directories
const processAllPdfsVisualLLM = () => {
  const manufacturers = fs.readdirSync(datasheetsFolderPath);
  manufacturers.forEach((mfr) => {
    const mfrPath = path.join(datasheetsFolderPath, mfr);
    if (fs.lstatSync(mfrPath).isDirectory()) {
      processPdfToImagesToJson(mfrPath);
    }
  });
};

// Process all PDFs to Images and to JSON with Visual LLM in all directories
//processAllPdfsVisualLLM();

//Text to JSON from all mnf and mpn in 'text' folder holding text  extracted from PDFs
//processAllDocumentsFromBaseDirectory('text');
