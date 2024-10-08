import fs from 'fs';
import path from 'path';

export function importMarkdownFile(filePath: string) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return fileContent;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const isTextMeaningful = (filePath: string): boolean => {
  const content = fs.readFileSync(filePath, 'utf8');

  // Check if the content is mostly printable ASCII characters
  const printableRatio =
    content
      .split('')
      .filter((char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126)
      .length / content.length;

  // Check if there's a minimum amount of text
  const minLength = 100;

  // You can adjust these thresholds as needed
  return content.length >= minLength && printableRatio > 0.8;
};
export const clearJsonEnds = (response: string): string => {
  return response.replace(/^[^{]*|[^}]*$/g, '');
};

export const requestController = async (
  request: Promise<any>,
  logText: string,
  maxRetries: number = 3,
  baseTimeout: number = 60000
) => {
  console.log(`Request: ${logText} started`);
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();
    const currentTimeout = baseTimeout * Math.pow(2, attempt - 1);

    const timer = setInterval(() => {
      const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
      console.log(
        `Request ${logText} processing for ${elapsedTime} seconds (Attempt ${attempt}/${maxRetries})`
      );
    }, 10000);

    try {
      const result = await Promise.race([
        request,
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Request timed out')),
            currentTimeout
          )
        ),
      ]);

      clearInterval(timer);
      console.log(`Request ${logText} succeeded on attempt ${attempt}`);
      return result;
    } catch (error) {
      clearInterval(timer);
      console.log(
        `Request ${logText} failed (Attempt ${attempt}/${maxRetries}). ${
          attempt < maxRetries
            ? `Retrying with timeout ${currentTimeout / 1000} seconds...`
            : 'Giving up.'
        }`
      );

      if (attempt === maxRetries) {
        throw error; // Throw the actual error instead of creating a new one
      }
    }
  }
  // This line should never be reached due to the throw in the loop,
  // but TypeScript might complain without it
  throw new Error(`Request failed after ${maxRetries} attempts`);
};

export const renameFilesInSubfolders = (
  baseFolder: string,
  newFileName: string
): void => {
  // Ensure the base folder exists
  if (!fs.existsSync(baseFolder)) {
    console.error(`Base folder ${baseFolder} does not exist.`);
    return;
  }

  // Read all manufacturers in the base folder
  const manufacturers = fs.readdirSync(baseFolder);

  manufacturers.forEach((manufacturer) => {
    const manufacturerPath = path.join(baseFolder, manufacturer);
    if (fs.statSync(manufacturerPath).isDirectory()) {
      // Read all parts in the manufacturer folder
      const parts = fs.readdirSync(manufacturerPath);

      parts.forEach((part) => {
        const partPath = path.join(manufacturerPath, part);
        if (fs.statSync(partPath).isDirectory()) {
          // Read all files in the part folder
          const files = fs.readdirSync(partPath);

          files.forEach((file) => {
            // Log the file being processed
            console.log(`Processing file: ${file}`);

            const oldPath = path.join(partPath, file);

            // Check if the file is 'llm_extract.json'
            if (file === 'llm_extract_text2') {
              // Ensure the new file name has a .json extension
              const newFileNameWithExtension = newFileName.endsWith('.json')
                ? newFileName
                : `${newFileName}.json`;
              const newPath = path.join(partPath, newFileNameWithExtension);

              // Rename the file
              fs.renameSync(oldPath, newPath);
              console.log(`Renamed ${oldPath} to ${newPath}`);
            }
          });
        }
      });
    }
  });

  console.log('File renaming process completed.');
};

export const copyFilesInBulk = (
  baseFolder: string,
  newFolder: string
): void => {
  // Ensure the base folder exists
  if (!fs.existsSync(baseFolder)) {
    console.error(`Base folder ${baseFolder} does not exist.`);
    return;
  }

  // Ensure the new folder exists, create it if it doesn't
  if (!fs.existsSync(newFolder)) {
    fs.mkdirSync(newFolder, { recursive: true });
  }

  // Read all manufacturers in the base folder
  const manufacturers = fs.readdirSync(baseFolder);

  manufacturers.forEach((manufacturer) => {
    const manufacturerPath = path.join(baseFolder, manufacturer);
    const newManufacturerPath = path.join(newFolder, manufacturer);

    if (fs.statSync(manufacturerPath).isDirectory()) {
      // Create manufacturer folder in new location if it doesn't exist
      if (!fs.existsSync(newManufacturerPath)) {
        fs.mkdirSync(newManufacturerPath, { recursive: true });
      }

      // Read all parts in the manufacturer folder
      const parts = fs.readdirSync(manufacturerPath);

      parts.forEach((part) => {
        const partPath = path.join(manufacturerPath, part);
        const newPartPath = path.join(newManufacturerPath, part);

        if (fs.statSync(partPath).isDirectory()) {
          // Create part folder in new location if it doesn't exist
          if (!fs.existsSync(newPartPath)) {
            fs.mkdirSync(newPartPath, { recursive: true });
          }

          // Read all files in the part folder
          const files = fs.readdirSync(partPath);

          files.forEach((file) => {
            const oldFilePath = path.join(partPath, file);
            const newFilePath = path.join(newPartPath, file);

            // Copy the file
            fs.copyFileSync(oldFilePath, newFilePath);
            console.log(`Copied ${oldFilePath} to ${newFilePath}`);
          });
        }
      });
    }
  });

  console.log('File copying process completed.');
};

// * Creates a log entry in a JSON file (`failed.json`) when an error
// occurs, instead of throwing an error.

export const createLogEntryOnError = (
  textFilePath: string,
  model: string,
  error: string
) => {
  // Create a JSON object containing details about the error and its
  const failedLog = {
    filename: path.basename(textFilePath), // Extracts the base name of the file from the textFilePath
    model: model, // The identifier or description of the model where the error occurred
    error: error, // The detailed error message or description
  };

  const failedLogPath = 'failed.json'; // Specifies the path to the log file

  // Check if the log file exists; if not, create it with an empty array
  if (!fs.existsSync(failedLogPath)) {
    fs.writeFileSync(failedLogPath, JSON.stringify([], null, 2)); //Writes an empty array to the file in JSON format
  }

  // Read the existing content of the log file and parse it as JSON
  const existingContent = fs.readFileSync(failedLogPath, 'utf8');
  const existingLogs = JSON.parse(existingContent);

  // Add the new error log to the list of logs
  existingLogs.push(failedLog);

  // Write the updated list of logs back to the file in a pretty-printed JSON format
  fs.writeFileSync(failedLogPath, JSON.stringify(existingLogs, null, 2));

  console.error(`Error logged to ${failedLogPath}`); // Logs an error message indicating where the log was saved
  return null; // Indicates that no data is being returned upon successful operation (failure case)
};
