// TODO import { Ocr } from 'node-ts-ocr';
import dotenv from 'dotenv';
dotenv.config();
const convertapi = require('convertapi')(process.env.CONVERT_API_KEY);

import fs from 'fs';
import path from 'path';
import { datasheetsFolderPath } from '..';

export async function pdfToTextOcr(filePath: string): Promise<void> {
  const pdfFilePath = filePath.replace('node_modules/fet-datasheets', '');
  const pdfPath = path.join(datasheetsFolderPath, pdfFilePath);

  // Check if the PDF file exists
  if (!fs.existsSync(pdfPath)) {
    console.log(`PDF file does not exist: ${pdfPath}`);
    // Create or append to nonExisting.json file
    const nonExistingJsonPath = path.join('nonExisting.json');
    let nonExistingPaths: string[] = [];
    if (fs.existsSync(nonExistingJsonPath)) {
      const nonExistingJson = fs.readFileSync(nonExistingJsonPath, 'utf-8');
      nonExistingPaths = JSON.parse(nonExistingJson);
    }
    if (!nonExistingPaths.includes(pdfPath)) {
      nonExistingPaths.push(pdfPath);
      fs.writeFileSync(
        nonExistingJsonPath,
        JSON.stringify(nonExistingPaths, null, 2)
      );
      console.log(`Added ${pdfPath} to nonExisting.json`);
    } else {
      console.log(`${pdfPath} already exists in nonExisting.json`);
    }
    return;
  }

  const textFilePath = path.join(
    'textOCR',
    pdfFilePath.replace('.pdf', '.txt')
  );

  // Check if the .txt file already exists
  if (fs.existsSync(textFilePath)) {
    console.log(`Text file already exists: ${textFilePath}`);
    return;
  }

  const outDir = path.dirname(textFilePath);
  try {
    console.log(`Loading PDF for OCR: ${pdfPath}`);
    convertapi
      .convert(
        'txt',
        {
          File: pdfPath,
        },
        'pdf'
      )
      .then(function (result: any) {
        // Create the directory if it doesn't exist
        if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir, { recursive: true });
        }

        // Save the text file
        result.file.save(textFilePath);
      });
  } catch (error: any) {
    console.error('Error extracting text from PDF:', error);
  }
}

// Usage
//pdfToText("datasheets/infineon/IPI072N10N3G.pdf")

const processAllBinaryPdf = (listPath: string) => {
  const readJsonFile = () => {
    const jsonFile = fs.readFileSync(listPath, 'utf-8');
    const jsonData = JSON.parse(jsonFile);
    return jsonData;
  };

  const jsonData = readJsonFile();
  jsonData.forEach((path: string) => {
    pdfToTextOcr(path);
  });
};

// USAGE
//processAllBinaryPdf('binaryPdfs.json');

//Native OCR  WIP
// // //  //  //  //  //  //  //
//create path to out directory
// const imagesOutDir = path.join('imagesOCR', pdfFilePath.replace('.pdf', ''));
// if (!fs.existsSync(imagesOutDir)) {
//   fs.mkdirSync(imagesOutDir, { recursive: true });
// }

// console.log(`Extracting text from PDF: ${filePath}`);
// console.log("Saving images to: ", imagesOutDir);

// const results = await Ocr.invokePdfToTiff(imagesOutDir, filePath);
// console.log(results);

// const extractedText = await Ocr.invokeImageOcr(outDir, pdfPath);
// console.log('PDF Text Content extracted with (OCR):');

// //Save the extracted text
// console.log(`Saving text file: ${textFilePath}`);
// const textDir = path.dirname(textFilePath);
// if (!fs.existsSync(textDir)) {
//   fs.mkdirSync(textDir, { recursive: true });
// }

// fs.writeFileSync(textFilePath, whisperResponse);
// console.log('Text saved successfully.');
