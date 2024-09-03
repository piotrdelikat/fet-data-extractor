import fs from 'fs';
import path from 'path';

function moveOmittedFiles(basePath: string) {
  const manufacturers = fs.readdirSync(basePath);

  manufacturers.forEach((mfr) => {
    const mfrPath = path.join(basePath, mfr);
    if (fs.statSync(mfrPath).isDirectory()) {
      const parts = fs.readdirSync(mfrPath);

      parts.forEach((part) => {
        const partPath = path.join(mfrPath, part);
        const imagesPath = path.join(partPath, 'images');
        const omittedPath = path.join(imagesPath, 'omitted');

        if (fs.existsSync(omittedPath)) {
          const omittedFiles = fs.readdirSync(omittedPath);

          omittedFiles.forEach((file) => {
            const sourcePath = path.join(omittedPath, file);
            const destinationPath = path.join(imagesPath, file);

            fs.renameSync(sourcePath, destinationPath);
            console.log(
              `Moved ${file} from omitted back to images for ${mfr}/${part}`
            );
          });

          // Delete the empty omitted folder
          fs.rmdirSync(omittedPath);
          console.log(`Deleted empty omitted folder for ${mfr}/${part}`);
        }
      });
    }
  });
}

const intermediatePath = path.join(__dirname, '..', '..', 'intermediate');
moveOmittedFiles(intermediatePath);
