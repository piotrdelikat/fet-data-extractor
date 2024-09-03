import fs from 'fs';
import path from 'path';

function fixFileNames(directoryPath: string) {
  const files = fs.readdirSync(directoryPath);

  files.forEach((file) => {
    if (file.match(/\.(\d+)\.png$/)) {
      const [prefix, pageNumber] = file.split('.');
      const newPageNumber =
        pageNumber.length === 1 ? pageNumber.padStart(2, '0') : pageNumber;
      const newFileName = `${prefix}.${newPageNumber}.png`;

      if (file !== newFileName) {
        fs.renameSync(
          path.join(directoryPath, file),
          path.join(directoryPath, newFileName)
        );
        console.log(`Renamed ${file} to ${newFileName}`);
      }
    }
  });
}

function processAllDirectories(basePath: string) {
  const manufacturers = fs.readdirSync(basePath);

  manufacturers.forEach((mfr) => {
    const mfrPath = path.join(basePath, mfr);
    if (fs.statSync(mfrPath).isDirectory()) {
      const models = fs.readdirSync(mfrPath);

      models.forEach((model) => {
        const imagesPath = path.join(mfrPath, model, 'images');
        if (fs.existsSync(imagesPath)) {
          fixFileNames(imagesPath);
        }
      });
    }
  });
}

const intermediatePath = path.join(__dirname, '..', '..', 'intermediate');
processAllDirectories(intermediatePath);
