import fs from 'fs';
import path from 'path';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { datasheetsFolderPath } from '..';
import { isTextMeaningful } from './helpers';

const pdfToText = async (filePath: string) => {
  const pdfFilePath = filePath.replace('datasheets', '');
  const pdfPath = path.join(datasheetsFolderPath, pdfFilePath);
  const textFilePath = path.join('text', pdfFilePath.replace('.pdf', '.txt'));

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
       fs.writeFileSync(nonExistingJsonPath, JSON.stringify(nonExistingPaths, null, 2));
       console.log(`Added ${pdfPath} to nonExisting.json`);
     } else {
       console.log(`${pdfPath} already exists in nonExisting.json`);
     }
     
    return;
  }

  // Check if the .txt file already exists
  if (fs.existsSync(textFilePath)) {
    console.log(`Text file already exists: ${textFilePath}`);
    return;
  }

  console.log(`Loading PDF: ${pdfPath}`);

  const loader = new PDFLoader(pdfPath, {
    splitPages: false
  });

  try {
    const docs = await loader.load();
    console.log('PDF Text Content:');

    // Iterate through all pages and save them
    console.log(`Saving text file: ${textFilePath}`);
    const textDir = path.dirname(textFilePath);
    if (!fs.existsSync(textDir)) {
        fs.mkdirSync(textDir, { recursive: true });
    }

    // Concatenate all page contents
    const allPageContent = docs.map(doc => doc.pageContent).join('\n');
    fs.writeFileSync(textFilePath, allPageContent);
    console.log('All pages saved successfully.');

    if (isTextMeaningful(textFilePath)) {
      console.log(`The extracted text appears to be meaningful. Path: ${textFilePath}`);
    } else {
      console.log('The extracted text might be binary or not meaningful.');
      // Delete the file
      fs.unlinkSync(textFilePath);

      // Create or append to binary.json file
      const binaryJsonPath = path.join('binaryPdfs.json');
      let binaryPaths: string[] = [];
      if (fs.existsSync(binaryJsonPath)) {
        const binaryJson = fs.readFileSync(binaryJsonPath, 'utf-8');
        binaryPaths = JSON.parse(binaryJson);
      }
      if (!binaryPaths.includes(pdfPath)) {
        binaryPaths.push(pdfPath);
        fs.writeFileSync(binaryJsonPath, JSON.stringify(binaryPaths, null, 2));
        console.log(`Added ${pdfPath} to binaryPdfs.json`);
      } else {
        console.log(`${pdfPath} already exists in binaryPdfs.json`);
      }
    }

  } catch (error) {
    console.error('Error loading PDF:', error);
  }
};

//read json file fet-data-extractor/unprocessed.json and perform the pdf to text conversion on each path. File is an array of paths as sttings
// const readJsonFile = () => {
//   const jsonFilePath = './unprocessed.json';
//   const jsonFile = fs.readFileSync(jsonFilePath, 'utf-8');
//   const jsonData = JSON.parse(jsonFile);
//   return jsonData;
// };

// const jsonData = readJsonFile();
// // console.log(jsonData);
// jsonData.forEach((path: string) => {
//   pdfToText(path);
// });

// Usage
//pdfToText("datasheets/infineon/IPI072N10N3G.pdf");


// Count results
const countProcessedFiles = () => {
  const textFolderPath = path.join('text');
  let totalCount = 0;

  if (fs.existsSync(textFolderPath)) {
    const manufacturers = fs.readdirSync(textFolderPath);
    manufacturers.forEach(mnf => {
      const mnfFolderPath = path.join(textFolderPath, mnf);
      if (fs.statSync(mnfFolderPath).isDirectory()) {
        const files = fs.readdirSync(mnfFolderPath);
        totalCount += files.length;
      }
    });
  }

  // Add count from binaryPdfs.json
  const binaryJsonPath = 'binaryPdfs.json';
  if (fs.existsSync(binaryJsonPath)) {
    const binaryJson = fs.readFileSync(binaryJsonPath, 'utf-8');
    const binaryPaths = JSON.parse(binaryJson);
    totalCount += binaryPaths.length;
  }

  // Add count from nonExisting.json
  const nonExistingJsonPath = 'nonExisting.json';
  if (fs.existsSync(nonExistingJsonPath)) {
    const nonExistingJson = fs.readFileSync(nonExistingJsonPath, 'utf-8');
    const nonExistingPaths = JSON.parse(nonExistingJson);
    totalCount += nonExistingPaths.length;
  }

  console.log(`Total processed files: ${totalCount}`);
};

const findUnprocessedFiles = (): string[] => {
  const textFolderPath = path.join('text');
  const processedPaths: string[] = [];

  // Collect paths from text folder
  if (fs.existsSync(textFolderPath)) {
    const manufacturers = fs.readdirSync(textFolderPath);
    manufacturers.forEach(mnf => {
      const mnfFolderPath = path.join(textFolderPath, mnf);
      if (fs.statSync(mnfFolderPath).isDirectory()) {
        const files = fs.readdirSync(mnfFolderPath);
        files.forEach(file => {
          processedPaths.push(`datasheets/${mnf}/${file.replace('.txt', '.pdf')}`);
        });
      }
    });
  }

  // Add paths from binaryPdfs.json
  const binaryJsonPath = 'binaryPdfs.json';
  if (fs.existsSync(binaryJsonPath)) {
    const binaryJson = fs.readFileSync(binaryJsonPath, 'utf-8');
    const binaryPaths: string[] = JSON.parse(binaryJson);
    processedPaths.push(...binaryPaths.map(path => path.replace('node_modules/fet-datasheets/', 'datasheets/')));
  }

  // Add paths from nonExisting.json
  const nonExistingJsonPath = 'nonExisting.json';
  if (fs.existsSync(nonExistingJsonPath)) {
    const nonExistingJson = fs.readFileSync(nonExistingJsonPath, 'utf-8');
    const nonExistingPaths: string[] = JSON.parse(nonExistingJson);
    processedPaths.push(...nonExistingPaths.map(path => path.replace('node_modules/fet-datasheets/', 'datasheets/')));
  }

  // Read unprocessed.json
  const unprocessedJsonPath = 'unprocessed.json';
  if (!fs.existsSync(unprocessedJsonPath)) {
    console.error('unprocessed.json not found');
    return [];
  }
  const unprocessedJson = fs.readFileSync(unprocessedJsonPath, 'utf-8');
  const unprocessedPaths: string[] = JSON.parse(unprocessedJson);

  // Find paths that are in unprocessed.json but not in processedPaths
  const remainingUnprocessed = unprocessedPaths.filter(path => !processedPaths.includes(path));

  console.log(`Remaining unprocessed files: ${remainingUnprocessed.length}`);
  console.log(remainingUnprocessed);

  return remainingUnprocessed;
};

//count how many files are in unprocessed.json witthout duplicates
const countUnprocessedFiles = () => {
  const unprocessedJsonPath = 'unprocessed.json';
  if (!fs.existsSync(unprocessedJsonPath)) {
    console.error('unprocessed.json not found');
    return;
  }
  const unprocessedJson = fs.readFileSync(unprocessedJsonPath, 'utf-8');
  const unprocessedPaths = JSON.parse(unprocessedJson);
  const uniquePaths = Array.from(new Set(unprocessedPaths));
  console.log(`Unique unprocessed files: ${uniquePaths.length}`);
  // Find and log duplicate files
  const duplicatePaths = unprocessedPaths.filter((path: string, index: number) => unprocessedPaths.indexOf(path) !== index);
  console.log(`Duplicate unprocessed files: ${duplicatePaths.length}`);
  console.log(duplicatePaths);
};


// countProcessedFiles();
// findUnprocessedFiles();
//countUnprocessedFiles();