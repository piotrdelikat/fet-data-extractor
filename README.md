# FET Datasheets Data Extractor

This project extracts values of electronic components from datasheets.

## Description

The `fet-datasheets` project is designed to extract values of electronic components from datasheets in PDF format. It converts PDF files into images and then analyzes these images to extract relevant information such as component names, manufacturers, specifications, and other pertinent details. The extracted data is formatted as JSON for easy consumption.

## Features

- Converts PDF datasheets to high-quality images.
- Reads and analyzes images to extract component information.
- Utilizes Athropic and OpenAI's API for multi model image analysis.
- Outputs the extracted data in JSON format.

## Installation

1. Clone the repository
2. Install dependencies with yarn:
   ```
   yarn install
   ```
3. Set up environment variables (if required)

Prerequisites for pdf to image conversion
node >= 14.x
graphicsmagick
ghostscript

Follow this guide to install the required dependencies.
https://github.com/yakovmeister/pdf2image/blob/HEAD/docs/gm-installation.md

## Environment Variables

Make sure to set up your environment variables by creating a `.env` file in the root directory with the following content:
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

## Usage

To run the main script:
yarn dev

## Utility Scripts

### Install MOSFETs datasheets

To work with a collection of MOSFET datasheet PDFs install available package with:

yarn install-datasheets

Or change datasheetsFolderPath to a folder containing the PDFs in index.ts file.

### Move Omitted Files

This script processes all directories in the 'intermediate' folder, moving any files found in 'omitted' subfolders back to their respective 'images' folders, and then deletes the empty 'omitted' folders.

To move files from the 'omitted' folder back to the main 'images' folder:

yarn move-omitted

### Fix File Names

This script ensures correct sorting order for image files by renaming them from `X.1.png` to `X.01.png` for pages 1-9.
To pad single-digit page numbers with a leading zero in image filenames:

yarn fix-filenames

### Copy Images Folders

This script copies content of 'images' folder to the 'intermediate' folder per manufacturer and component to separate images folder.

yarn copyImagesFolders

## File Processing

The main script (`src/index.ts`) handles the following tasks:

1. PDF to Image conversion
2. Pages preselection (gpt-4o-mini)
3. Data extraction from images (sonnet-3-5)
4. Chart reading (V_plateau) (sonnet-3-5)
5. Saving the extracted data in JSON format

For more details on each process, refer to the respective utility files in the `src/utils` directory.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
