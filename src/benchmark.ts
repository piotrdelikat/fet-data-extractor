import fs from 'fs';
import path from 'path';
import {
  processPdfToImagesToJson,
  processSingleDocument,
  processTextToJson,
} from './processes';
import { Images } from 'openai/resources';
import { pdfToText } from './utils/pdfToText';
import { pdfToTextOcr } from './utils/pdfToTextOcr';
import { readValuesFromTextOpenAI } from './utils/openAI/extractDataFromText';

// Read the benchmark.json file
const benchmarkPath = path.join(__dirname, '..', 'benchmark.json');
const benchmarkData = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'));

// Process each document path in the benchmark array
export const processBenchmarkDocuments = async () => {
  benchmarkData.forEach(async (documentPath: string) => {
    // Extract manufacturer and part number from the path
    const pathParts = documentPath.split('/');
    const manufacturer = pathParts[1];
    const partNumber = path.basename(documentPath, '.pdf');

    // Check if the corresponding file exists in node_modules/fet-datasheets
    const fetDatasheetPath = path.join(
      'node_modules',
      'fet-datasheets',
      manufacturer,
      `${partNumber}.pdf`
    );

    const filePath = path.join(manufacturer, `${partNumber}.pdf`);

    if (!fs.existsSync(fetDatasheetPath)) {
      console.log(`File not found: ${documentPath}`);
    }

    //   - PDF to text if tex cannot be extracted fallback to OCR
    // await pdfToText(filePath).then(() => {
    //   console.log(`File processed to text: ${documentPath}`);
    //   // processTextToJson(
    //   //   `text/${manufacturer}/${partNumber}.txt`,
    //   //   'llm_extract_text2',
    //   //   'claude-3-haiku-20240307'
    //   // );
    // });

    //   - PDF to text if tex cannot be extracted fallback to OCR
    // console.log(`File processed to text: ${documentPath}`);
    // await pdfToTextOcr(fetDatasheetPath);

    //OCR to text
    const textFilePath = `textOCR/${manufacturer}/${partNumber}.txt`;
    if (fs.existsSync(textFilePath)) {
      await processTextToJson(
        textFilePath,
        'llm_extract_ocr_text2',
        'llama-3.1-70b-versatile', //'claude-3-5-sonnet-20240620',
        'benchmark'
      );
    } else {
      console.log(`Text file not found: ${textFilePath}`);
    }

    //PDF to Images to JSON
    // await processSingleDocument(
    //   fetDatasheetPath,
    //   'llm_extract_images2',
    //   'claude-3-5-sonnet-20240620',
    //   false,
    //   'benchmark'
    // );
  });
};

////////////////////- PDF to text
// Construct the path to the corresponding text file
// // const textFilePath = path.join('text', manufacturer, `${partNumber}.txt`);

// // Check if the text file exists
// if (fs.existsSync(textFilePath)) {
//   console.log(`Processing: ${textFilePath}`);
//   // Process the text file to JSON
//   await processTextToJson(textFilePath, 'benchmark_extract', 'claude-3-haiku-20240307');
// } else {
//   console.log(`Text file not found for: ${documentPath}`);
//   // TODO: Consider adding logic to handle missing text files
//   // For example, you could add these to a list of files that need PDF-to-text conversion
// }

// 3. Process each document path in the benchmark array using tree menthods and two LLMs
//   - PDF to text [DONE]
//     - text to JSON with gpt-4o-min [DONE]
//   - PDF to OCR text [DONE]
//     - text to JSON with gpt-4o-min [DONE]

//   - PDF to Images
//     - images to JSON with sonnet-3-5

const checkForBinaryPdfInBenchmarkSet = () => {
  const benchmarkPath = 'benchmark.json';
  const binaryPdfsPath = 'binaryPdfs.json';
  const benchmarkBinaryPdfsPath = 'benchmarkBinaryPdfs.json';

  // Read benchmark.json and binaryPdfs.json
  const benchmark = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'));
  const binaryPdfs = JSON.parse(fs.readFileSync(binaryPdfsPath, 'utf8'));

  // Filter binary PDFs that are in the benchmark set
  const benchmarkBinaryPdfs = binaryPdfs.filter((pdfPath: string) =>
    benchmark.some((benchmarkPath: string) => {
      const [manufacturer, filename] = benchmarkPath.split('/').slice(-2);
      return pdfPath.includes(`${manufacturer}/${filename}`);
    })
  );

  // Save the filtered list to benchmarkBinaryPdfs.json
  fs.writeFileSync(
    benchmarkBinaryPdfsPath,
    JSON.stringify(benchmarkBinaryPdfs, null, 2)
  );

  console.log(
    `Saved ${benchmarkBinaryPdfs.length} binary PDFs from the benchmark set to benchmarkBinaryPdfs.json`
  );
};

// checkForBinaryPdfInBenchmarkSet();
