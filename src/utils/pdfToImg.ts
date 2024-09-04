import { fromPath } from 'pdf2pic';
import fs from 'fs';
import path from 'path';
import { datasheetsFolderPath } from '..';

export const convertPdfToImage = async (mfr: string, mpn: string) => {
  const savePath = path.join('images', mfr, mpn);
  const filePath = `${datasheetsFolderPath}/${mfr}/${mpn}.pdf`;

  console.log(`Converting PDF: ${filePath} to PNG images in ${savePath}`);
  // Check and create the directory if it doesn't exist
  if (!fs.existsSync(savePath)) {
    fs.mkdirSync(savePath, { recursive: true });
  }

  const options = {
    quality: 90,
    density: 300,
    saveFilename: mpn,
    savePath: savePath,
    width: 768,
    height: 1024,
    format: 'png',
  };

  try {
    const convert = fromPath(filePath, options);
    const result = await convert.bulk(-1, { responseType: 'image' });
    console.log('PDF conversion completed');

    // Check if any images were actually created
    const createdImages = fs
      .readdirSync(savePath)
      .filter((file) => file.endsWith('.png'));
    if (createdImages.length === 0) {
      console.log('No images were created');
      throw new Error('No images were created');
    }

    // Rename files to include leading zeros
    createdImages.forEach((file) => {
      const [, pageNumber] = file.match(/\.(\d+)\.png$/) || [];
      if (pageNumber) {
        const newFileName = `${mpn}.${pageNumber.padStart(2, '0')}.png`;
        fs.renameSync(
          path.join(savePath, file),
          path.join(savePath, newFileName)
        );
      }
    });

    console.log('File renaming completed');
    return result;
  } catch (error) {
    console.error(`Error converting PDF to image for ${mfr}/${mpn}`);

    // Remove the folder if it was created but is empty
    if (fs.existsSync(savePath) && fs.readdirSync(savePath).length === 0) {
      fs.rmdirSync(savePath, { recursive: true });
    }

    // Return null or some indicator that the conversion failed
    return null;
  }
};