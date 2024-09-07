import fs from 'fs';
import path from 'path';
import { processPdfToImagesToJson, processTextToJson } from './processes';

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

const processAllTextDocumentsTextLLM = (folderPath: string) => {
  const files = fs.readdirSync(folderPath);
  files.forEach((file) => {
    if (file.endsWith('.txt')) {
      const filePath = path.join(folderPath, file);
      processTextToJson(filePath);
    }
  });
};

// Example usage:
// processAllTextDocumentsTextLLM('text/diodes');
// processAllTextDocumentsTextLLM('text/toshiba');
// processAllTextDocumentsTextLLM('text/epc_space')
