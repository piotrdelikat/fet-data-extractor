# FET Datasheets Data Extractor

This project extracts values of electronic components from datasheets.

## Description

The `fet-datasheets` project is designed to extract values of electronic components from datasheets in PDF format. It converts PDF files into text or images and then analyzes these images to extract relevant information such as component names, manufacturers, specifications, and other pertinent details. The extracted data is formatted as JSON for easy consumption.

## Features

- Extracts text from PDFs.
- Converts PDF datasheets to high-quality images used for text extraction with OCR or Visual LLM.
- Analyzes text or images to extract component information.
- Utilizes Athropic model Sonnet-3-5 for extracting V Plateau value from Gate Charge chart.
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

If you use convertapi for pdf to text conversion using OCR
CONVERT_API_KEY=your_convert_api_key

## Usage

Uncomment the desired function and run the main script:
yarn dev

## Utility Scripts

### Install MOSFETs datasheets

To work with a collection of MOSFET datasheet PDFs install available package with:

yarn install-datasheets

Or change datasheetsFolderPath to a folder containing the PDFs in index.ts file.

## File Processing

The main scripts in (`src/index.ts`) handles the following tasks:

- processAllPdfsVisualLLM
  calls processPdfToImagesToJson on all directories in datasheetsFolderPath (./node_modules/fet-datasheets)

1. PDF to Image conversion
2. Pages preselection (gpt-4o-mini)
3. Data extraction from images (sonnet-3-5)
4. Chart reading (V_plateau) (sonnet-3-5)
5. Saving the extracted data in JSON format

- processAllDocumentsFromBaseDirectory('text');
  Convert Text to JSON with LLM from all mnf and mpn in 'text' folder holding text extracted from PDFs

For more details on each process, refer to the respective utility files in the `src/utils` directory.

TODO:

- Add preselection of pages to find page with Gate Charge chart based on text extracted from pdf.
- Benchmarking results from different methods text/OCR to text/Visual LLM for completeness of parameters required for calcualating Power Loss
- Tests
- CLI commands

## License

This project is licensed under the MIT License - see the LICENSE file for details.
