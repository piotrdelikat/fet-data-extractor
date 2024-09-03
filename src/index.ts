import fs from 'fs';
import path from 'path';
import { convertPdfToImage } from './utils/pdfToImg';
import { readValuesFromImagesAnthropic } from './utils/anthropic/extractData';
import { readVplateauAnthropic } from './utils/anthropic/readCharts';
import { preselectPagesOpenAI } from './utils/openAI/preselectPages';

// Set the datasheets folder path
export const datasheetsFolderPath = './node_modules/fet-datasheets';

const handlePdfConversion = async (mfr: string, mpn: string) => {
  try {
    await convertPdfToImage(mfr, mpn);
    console.log(`Successfully converted ${mpn} to image.`);
  } catch (error) {
    console.error(`Error converting ${mpn}:`, error);
  }
};

const processDocuments = async (
  directoryPath: string,
  model: string = 'claude-3-5-sonnet-20240620'
) => {
  const pdfFiles = fs
    .readdirSync(directoryPath)
    .filter((file) => file.endsWith('.pdf'));

  for (const pdfFile of pdfFiles) {
    const filePath = path.join(directoryPath, pdfFile);
    const fileName = pdfFile.replace('.pdf', ''); // Remove .pdf from the filename

    const mfr = path.basename(directoryPath);
    const mpn = fileName;

    const intermediatePath = path.join('intermediate', mfr, mpn);
    const imagesPath = path.join(intermediatePath, 'images');
    const llmExtractPath = path.join(
      intermediatePath,
      `llm_extract_${model}.json`
    );

    // Check if the intermediate path exists, if not, create it
    if (!fs.existsSync(intermediatePath)) {
      fs.mkdirSync(intermediatePath, { recursive: true });
      console.log(`Created directory: ${intermediatePath}`);
    }

    // Check if the images path exists, if not, convert the PDF to images
    if (!fs.existsSync(imagesPath)) {
      await handlePdfConversion(mfr, mpn);
    } else {
      console.log(`Images already exist for: ${mfr}/${mpn}`);
    }

    const preselectionResult = await preselectPagesOpenAI(imagesPath); // await preselectPagesAnthropic(imagesPath);
    let jsonOutput: any = {};

    //Check if the llm_extract.json file exists, if not, read values from images
    if (!fs.existsSync(llmExtractPath)) {
      // Anthropic
      const dataReadResult = await readValuesFromImagesAnthropic(
        imagesPath,
        preselectionResult.dataPages,
        model
      );
      jsonOutput = dataReadResult;
    } else {
      console.log(`Values already extracted for: ${mfr}/${mpn}`);
    }

    if (preselectionResult.chartPages.V_plateau) {
      const vPlateauResult = await readVplateauAnthropic(
        imagesPath,
        preselectionResult.chartPages.V_plateau,
        model
      );
      console.log(vPlateauResult);
      jsonOutput['V_plateau'] = vPlateauResult.Vplateau;
    }

    const jsonFolderPath = intermediatePath;
    const outputFileName = `llm_extract_${model}.json`;

    fs.writeFileSync(
      path.join(jsonFolderPath, outputFileName),
      JSON.stringify(jsonOutput, null, 0)
    );

    console.log(
      `Analysis complete. Output written to: ${path.join(
        jsonFolderPath,
        outputFileName
      )}`
    );
  }
};

// Call processDocuments on all directories
const processAllManufacturers = () => {
  const manufacturers = fs.readdirSync(datasheetsFolderPath);
  manufacturers.forEach((mfr) => {
    const mfrPath = path.join(datasheetsFolderPath, mfr);
    if (fs.lstatSync(mfrPath).isDirectory()) {
      processDocuments(mfrPath);
    }
  });
};

// Call processDocuments on individual directories for testing
// processDocuments(`${datasheetsFolderPath}/analog`);
// processDocuments(`${datasheetsFolderPath}/anhi`);
// processDocuments(`${datasheetsFolderPath}/apm`);
// processDocuments(`${datasheetsFolderPath}/epc_space`);
//processDocuments(`${datasheetsFolderPath}/slkor`);
// processDocuments(`${datasheetsFolderPath}/ts`);

// readVplateau('./intermediate/epc_space/EPC7018GC', 'EPC7018GC.5.png').then(
//   (res) => console.log(res)
// );

// Call processDocuments on all directories
//processAllManufacturers();
