import fs from 'fs';
import path from 'path';
import { convertPdfToImage } from './utils/pdfToImg';
import { readValuesFromImagesAnthropic } from './utils/anthropic/extractDataFromImages';
import { readVplateauAnthropic } from './utils/anthropic/readCharts';
import { preselectPagesOpenAI } from './utils/openAI/preselectPages';
import { readValuesFromTextAnthropic } from './utils/anthropic/extractDataFromText';
import { datasheetsFolderPath } from '.';

export const processPdfToImagesToJson = async (
  directoryPath: string,
  limit?: number,
  model: string = 'claude-3-5-sonnet-20240620'
) => {
  const pdfFiles = fs
    .readdirSync(directoryPath)
    .filter((file) => file.endsWith('.pdf'));

  for (const pdfFile of pdfFiles.slice(0, limit)) {
    const filePath = path.join(directoryPath, pdfFile);
    const fileName = pdfFile.replace('.pdf', ''); // Remove .pdf from the filename

    const mfr = path.basename(directoryPath);
    const mpn = fileName;

    const imagesPath = path.join('images', mfr, mpn);
    const intermediatePath = path.join('intermediate', mfr, mpn);
    const llmExtractPath = path.join(intermediatePath, `llm_extract.json`);

    // Check if the images path exists, if not, convert the PDF to images
    if (!fs.existsSync(imagesPath) || fs.readdirSync(imagesPath).length === 0) {
      const conversionResult = await convertPdfToImage(mfr, mpn);
      if (conversionResult === null) {
        console.log(`Skipping ${mpn} due to conversion failure.`);
        continue; // Skip to the next PDF
      }
    } else {
      console.log(`Images already exist for: ${mfr}/${mpn}`);
    }

    let jsonOutput: any = {};
    let dataUpdated = false;

    // Check if the intermediate path exists, if not, create it
    if (!fs.existsSync(intermediatePath)) {
      fs.mkdirSync(intermediatePath, { recursive: true });
      console.log(`Created directory: ${intermediatePath}`);
    }
    // Check if the llm_extract.json file exists
    if (fs.existsSync(llmExtractPath)) {
      // If it exists, read the existing content
      const existingContent = fs.readFileSync(llmExtractPath, 'utf-8');
      jsonOutput = JSON.parse(existingContent);
      console.log(`Existing data found for: ${mfr}/${mpn}`);

      // Check if V_plateau exists in the JSON
      if (
        !jsonOutput.charts?.Gate_Charge?.V_plateau ||
        jsonOutput.charts?.Gate_Charge?.V_plateau === 'unknown'
      ) {
        // If V_plateau doesn't exist, perform the preselection step
        const preselectionResult = await preselectPagesOpenAI(imagesPath);
        const vPlateauResult = await readVplateauAnthropic(
          imagesPath,
          preselectionResult.chartPages.V_plateau,
          model
        );

        console.log(
          'V_plateau extraction result:',
          JSON.stringify(vPlateauResult, null, 2)
        );
        if (!jsonOutput.charts) jsonOutput.charts = {};
        if (!jsonOutput.charts.Gate_Charge) jsonOutput.charts.Gate_Charge = {};
        jsonOutput.charts.Gate_Charge.V_plateau = vPlateauResult.Vplateau;
        dataUpdated = true;
      }
    } else {
      // If llm_extract.json doesn't exist, perform both preselection and data extraction
      const preselectionResult = await preselectPagesOpenAI(imagesPath);
      const dataReadResult = await readValuesFromImagesAnthropic(
        imagesPath,
        preselectionResult.dataPages,
        model
      );
      jsonOutput = dataReadResult;
      dataUpdated = true;

      if (preselectionResult.chartPages.V_plateau) {
        const vPlateauResult = await readVplateauAnthropic(
          imagesPath,
          preselectionResult.chartPages.V_plateau,
          model
        );
        console.log(vPlateauResult);
        if (!jsonOutput.charts) jsonOutput.charts = {};
        if (!jsonOutput.charts.Gate_Charge) jsonOutput.charts.Gate_Charge = {};
        jsonOutput.charts.Gate_Charge.V_plateau = vPlateauResult.Vplateau;
      }
    }

    // Write the updated JSON back to the file only if data was updated
    if (dataUpdated) {
      fs.writeFileSync(llmExtractPath, JSON.stringify(jsonOutput, null, 2));
      console.log(`Analysis complete. Output written to: ${llmExtractPath}`);
    } else {
      console.log(`No new data to update for: ${mfr}/${mpn}`);
    }
  }
};

// Call processDocuments on individual directories for testing
// processDocuments(`${datasheetsFolderPath}/infineon`, 6);
// processDocuments(`${datasheetsFolderPath}/ao`, 6);
// processDocuments(`${datasheetsFolderPath}/slkor`, 1);
// processPdfToImagesToJson(`${datasheetsFolderPath}/goford`, 3);

export const processTextToJson = async (
  filePath: string,
  outputFileName: string,
  model: string = 'claude-3-5-sonnet-20240620'
) => {
  const mpn = path.basename(filePath, '.txt');

  const mfr = path.basename(path.dirname(filePath));

  const intermediatePath = path.join('intermediate', mfr, mpn);

  const llmExtractPath = path.join(
    intermediatePath,
    `${outputFileName}_${model}.json`
  );
  const textFilePath = filePath;

  // Check if the intermediate path exists, if not, create it
  if (!fs.existsSync(intermediatePath)) {
    fs.mkdirSync(intermediatePath, { recursive: true });
    console.log(`Created directory: ${intermediatePath}`);
  }

  // Check if the llm_extract.json file exists
  if (fs.existsSync(llmExtractPath)) {
    console.log(`Existing data found for: ${mfr}/${mpn}`);
    return;
  }

  // If llm_extract.json doesn't exist, perform data extraction from text
  if (fs.existsSync(textFilePath)) {
    const jsonOutput = await readValuesFromTextAnthropic(textFilePath, model);

    // Write the JSON output to the file
    fs.writeFileSync(llmExtractPath, JSON.stringify(jsonOutput, null, 2));
    console.log(`Analysis complete. Output written to: ${llmExtractPath}`);
  } else {
    console.log(`Text file not found: ${textFilePath}`);
  }
};

const processAllTextDocumentsForMnfTextLLM = (folderPath: string) => {
  const files = fs.readdirSync(folderPath);
  files.forEach((file) => {
    if (file.endsWith('.txt')) {
      const filePath = path.join(folderPath, file);
      //USING SONNET-3-5 MODEL BY DEFAULLT
      processTextToJson(filePath, 'llm_extract');
    }
  });
};

// Example usage:
// processAllTextDocumentsForMnfTextLLM('text/diodes');

export const processAllDocumentsFromBaseDirectory = async (
  directoryBasePath: string
) => {
  // Check if the directory exists
  if (!fs.existsSync(directoryBasePath)) {
    console.error(`Directory does not exist: ${directoryBasePath}`);
    return;
  }

  // Read all subdirectories in the base directory
  const subdirectories = fs
    .readdirSync(directoryBasePath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  for (const subdirectory of subdirectories) {
    const subdirectoryPath = path.join(directoryBasePath, subdirectory);
    const files = fs.readdirSync(subdirectoryPath);

    for (const file of files) {
      if (file.endsWith('.txt')) {
        const filePath = path.join(subdirectoryPath, file);
        await processTextToJson(
          filePath,
          'llm_extract_text2',
          'claude-3-haiku-20240307'
        );
      }
    }
  }

  console.log('Finished processing all documents.');
};

const processSingleDocument = async (
  filePath: string,
  model: string = 'claude-3-5-sonnet-20240620'
) => {
  const fileName = path.basename(filePath, '.pdf');
  const mfr = path.basename(path.dirname(filePath));
  const mpn = fileName;

  const imagesPath = path.join('images', mfr, mpn);
  const intermediatePath = path.join('intermediate', mfr, mpn);
  const llmExtractPath = path.join(intermediatePath, `llm_extract.json`);

  // Check if the images path exists, if not, convert the PDF to images
  if (!fs.existsSync(imagesPath) || fs.readdirSync(imagesPath).length === 0) {
    const conversionResult = await convertPdfToImage(mfr, mpn);
    if (conversionResult === null) {
      console.log(`Skipping ${mpn} due to conversion failure.`);
      return;
    }
  } else {
    console.log(`Images already exist for: ${mfr}/${mpn}`);
  }

  let jsonOutput: any = {};
  let dataUpdated = false;

  // Check if the intermediate path exists, if not, create it
  if (!fs.existsSync(intermediatePath)) {
    fs.mkdirSync(intermediatePath, { recursive: true });
    console.log(`Created directory: ${intermediatePath}`);
  }

  // Check if the llm_extract.json file exists
  if (fs.existsSync(llmExtractPath)) {
    // If it exists, read the existing content
    const existingContent = fs.readFileSync(llmExtractPath, 'utf-8');
    jsonOutput = JSON.parse(existingContent);
    console.log(`Existing data found for: ${mfr}/${mpn}`);

    // Check if V_plateau exists in the JSON
    if (
      !jsonOutput.charts?.Gate_Charge?.V_plateau ||
      jsonOutput.charts?.Gate_Charge?.V_plateau === 'unknown'
    ) {
      // If V_plateau doesn't exist, perform the preselection step
      const preselectionResult = await preselectPagesOpenAI(imagesPath);
      const vPlateauResult = await readVplateauAnthropic(
        imagesPath,
        preselectionResult.chartPages.V_plateau,
        model
      );

      console.log(
        'V_plateau extraction result:',
        JSON.stringify(vPlateauResult, null, 2)
      );
      if (!jsonOutput.charts) jsonOutput.charts = {};
      if (!jsonOutput.charts.Gate_Charge) jsonOutput.charts.Gate_Charge = {};
      jsonOutput.charts.Gate_Charge.V_plateau = vPlateauResult.Vplateau;
      dataUpdated = true;
    }
  } else {
    // If llm_extract.json doesn't exist, perform both preselection and data extraction
    const preselectionResult = await preselectPagesOpenAI(imagesPath);
    const dataReadResult = await readValuesFromImagesAnthropic(
      imagesPath,
      preselectionResult.dataPages,
      model
    );
    jsonOutput = dataReadResult;
    dataUpdated = true;

    if (preselectionResult.chartPages.V_plateau) {
      const vPlateauResult = await readVplateauAnthropic(
        imagesPath,
        preselectionResult.chartPages.V_plateau,
        model
      );
      console.log(vPlateauResult);
      if (!jsonOutput.charts) jsonOutput.charts = {};
      if (!jsonOutput.charts.Gate_Charge) jsonOutput.charts.Gate_Charge = {};
      jsonOutput.charts.Gate_Charge.V_plateau = vPlateauResult.Vplateau;
    }
  }

  // Write the updated JSON back to the file only if data was updated
  if (dataUpdated) {
    fs.writeFileSync(llmExtractPath, JSON.stringify(jsonOutput, null, 2));
    console.log(`Analysis complete. Output written to: ${llmExtractPath}`);
  } else {
    console.log(`No new data to update for: ${mfr}/${mpn}`);
  }
};

//processSingleDocument(`${datasheetsFolderPath}/infineon/IAUT300N08S5N012ATMA1.pdf`);
