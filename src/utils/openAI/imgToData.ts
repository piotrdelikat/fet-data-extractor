import openai, { fixJson } from './openAI';

import fs from 'fs';
import path from 'path';
import { importMarkdownFile } from '../helpers';

export async function readValuesFromImageOpenAI(
  folderPath: string,
  model = 'gpt-4o-mini'
) {
  const imagesPath = folderPath;

  console.log(`Reading images from: ${imagesPath}`);
  const images = fs
    .readdirSync(imagesPath)
    .filter((file) => /\.(jpg|jpeg|png|gif)$/.test(file));

  console.log(`Found ${images.length} images to analyze.`);
  const content = [];

  for (const image of images) {
    const imagePath = path.join(imagesPath, image);
    console.log(`Reading tabular data from image: ${imagePath}`);
    const base64Image = fs.readFileSync(imagePath).toString('base64');

    content.push({
      type: 'image_url',
      image_url: {
        url: `data:image/jpeg;base64,${base64Image}`,
        detail: 'high',
      },
    });
  }

  // Read example images
  const examplesPath = `./src/utils/examples`;
  const exampleOutputFile = `${examplesPath}/llm_extract_gpt-4o.json`;

  const exampleImages = fs
    .readdirSync(examplesPath)
    .filter((file) => /\.(jpg|jpeg|png|gif)$/.test(file))
    .map((file) => {
      const imagePath = path.join(examplesPath, file);
      const base64Image = fs.readFileSync(imagePath).toString('base64');
      return {
        type: 'image_url',
        image_url: {
          url: `data:image/jpeg;base64,${base64Image}`,
          detail: 'high',
        },
      };
    });

  // Read example output JSON
  const exampleOutput = JSON.parse(fs.readFileSync(exampleOutputFile, 'utf-8'));

  console.log(`Sending ${content.length} images for analysis.`);

  const DatasheetReadingSystem = importMarkdownFile(
    'prompts/datasheetReading/DatasheetReadingSystem.md'
  );
  const DatasheetReadingUser = importMarkdownFile(
    'prompts/datasheetReading/DatasheetReadingUser.md'
  );

  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `${DatasheetReadingSystem}`,
      },
      {
        role: 'user',
        content: [...(exampleImages as any)],
      },
      {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: `${JSON.stringify(exampleOutput)}`,
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `${DatasheetReadingUser}`,
          },

          ...(content as any),
        ],
      },
    ],
    temperature: 0,
    response_format: { type: 'json_object' },
  });

  let jsonOutput;
  try {
    jsonOutput = JSON.parse(response.choices[0].message.content as string);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    jsonOutput = fixJson(response.choices[0].message.content as string);
  }
  const jsonFolderPath = folderPath.replace('images', '');

  const outputFileName = `llm_extract_${model}.json`;

  fs.writeFileSync(
    path.join(jsonFolderPath, outputFileName),
    JSON.stringify(jsonOutput, null, 0) // No indentation to avoid extra spaces or newlines
  );

  console.log(
    `Analysis complete. Output written to: ${path.join(
      jsonFolderPath,
      outputFileName
    )}`
  );
}

//Send Image to LLM one by one and append results to the same JSON
export async function readValuesFromImage(
  folderPath: string,
  model = 'gpt-4o-mini'
) {
  const imagesPath = folderPath;

  console.log(`Reading images from: ${imagesPath}`);
  const images = fs
    .readdirSync(imagesPath)
    .filter((file) => /\.(jpg|jpeg|png|gif)$/.test(file));

  console.log(`Found ${images.length} images to analyze.`);
  const jsonFolderPath = folderPath.replace('images', '');
  const outputFileName = `llm_extract_${model}_oneByOne.json`;
  const outputFilePath = path.join(jsonFolderPath, outputFileName);

  let existingData = [];
  if (fs.existsSync(outputFilePath)) {
    console.log(`Existing JSON file found. Appending to it.`);
    existingData = JSON.parse(fs.readFileSync(outputFilePath, 'utf-8'));
  } else {
    console.log(`No existing JSON file found. Creating a new one.`);
  }

  for (const image of images) {
    const imagePath = path.join(imagesPath, image);
    console.log(`Reading tabular data from image: ${imagePath}`);
    const base64Image = fs.readFileSync(imagePath).toString('base64');

    const content = [
      {
        type: 'image_url',
        image_url: {
          url: `data:image/jpeg;base64,${base64Image}`,
        },
      },
    ];

    const DatasheetReadingSystem = importMarkdownFile(
      'prompts/datasheetReading/DatasheetReadingSystem.md'
    );
    const DatasheetReadingUser = importMarkdownFile(
      'prompts/datasheetReading/DatasheetReadingUser.md'
    );
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `${DatasheetReadingSystem}`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `${DatasheetReadingUser}`,
            },
            ...(content as any),
          ],
        },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    const jsonOutput = JSON.parse(
      response.choices[0].message.content as string
    );
    existingData.push(jsonOutput);

    fs.writeFileSync(
      outputFilePath,
      JSON.stringify(existingData, null, 0) // No indentation to avoid extra spaces or newlines
    );

    console.log(
      `Analysis complete for image: ${imagePath}. Output appended to: ${outputFilePath}`
    );
  }

  console.log(
    `All images processed. Final output written to: ${outputFilePath}`
  );
}
