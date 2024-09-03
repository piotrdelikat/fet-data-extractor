import { fromPath } from 'pdf2pic';
import fs from 'fs';
import path from 'path';
import { datasheetsFolderPath } from '..';

export const convertPdfToImage = async (mfr: string, mpn: string) => {
  const savePath = path.join('images', mfr, mpn);

  // Check and create the directory if it doesn't exist
  if (!fs.existsSync(savePath)) {
    fs.mkdirSync(savePath, { recursive: true });
  }

  const options = {
    quality: 90, // Increased quality for better readability
    density: 300, // Higher density for clearer text
    saveFilename: mpn,
    savePath: savePath,
    width: 768,
    height: 1024,
    format: 'png',
  };

  const filePath = `${datasheetsFolderPath}/${mfr}/${mpn}.pdf`;
  const convert = fromPath(filePath, options);

  const result = await convert.bulk(-1, { responseType: 'image' });
  console.log('PDF conversion completed');

  // Rename files to include leading zeros
  fs.readdirSync(savePath).forEach((file) => {
    if (file.startsWith(mpn) && file.endsWith('.png')) {
      const [, pageNumber] = file.match(/\.(\d+)\.png$/) || [];
      if (pageNumber) {
        const newFileName = `${mpn}.${pageNumber.padStart(2, '0')}.png`;
        fs.renameSync(
          path.join(savePath, file),
          path.join(savePath, newFileName)
        );
      }
    }
  });

  console.log('File renaming completed');
  return result;
};
