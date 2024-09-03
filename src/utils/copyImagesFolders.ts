import fs from 'fs';
import path from 'path';

function copyImagesFolder(sourcePath: string, destinationPath: string) {
  if (!fs.existsSync(sourcePath)) {
    console.log(`Source path does not exist: ${sourcePath}`);
    return;
  }

  if (!fs.existsSync(destinationPath)) {
    fs.mkdirSync(destinationPath, { recursive: true });
  }

  const files = fs.readdirSync(sourcePath);

  files.forEach((file) => {
    const sourceFile = path.join(sourcePath, file);
    const destFile = path.join(destinationPath, file);

    fs.copyFileSync(sourceFile, destFile);
    console.log(`Copied ${sourceFile} to ${destFile}`);
  });

  // Delete the source folder after copying
  fs.rmSync(sourcePath, { recursive: true, force: true });
  console.log(`Deleted source folder: ${sourcePath}`);
}

function processAllDirectories() {
  const intermediatePath = path.join('intermediate');
  const manufacturers = fs.readdirSync(intermediatePath);

  manufacturers.forEach((mfr) => {
    const mfrPath = path.join(intermediatePath, mfr);
    if (fs.statSync(mfrPath).isDirectory()) {
      const models = fs.readdirSync(mfrPath);

      models.forEach((mpn) => {
        const sourceImagesPath = path.join(
          intermediatePath,
          mfr,
          mpn,
          'images'
        );
        const destinationImagesPath = path.join('images', mfr, mpn);

        if (fs.existsSync(sourceImagesPath)) {
          copyImagesFolder(sourceImagesPath, destinationImagesPath);
        }
      });
    }
  });
}

processAllDirectories();
