import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

import dotenv from 'dotenv';
import { importMarkdownFile } from '../helpers';
import { datasheetsFolderPath } from '../..';
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default openai;

export const readVplateau = async (
  folderPath: string,
  imageFileName: string
) => {
  const filePath = folderPath + '/images' + '/omitted/' + imageFileName;
  const base64Image = fs.readFileSync(filePath).toString('base64');

  const VPlateauSystem = importMarkdownFile(
    'prompts/charts/V_plateau/V_plateauSystem.md'
  );
  const VPlateauUser = importMarkdownFile(
    'prompts/charts/V_plateau/V_plateauUser.md'
  );

  const examples = [
    {
      filePath: './prompts/charts/V_plateau/examples/v_p-3.98.png',
      Vplateau: '3.98',
    },
    {
      filePath: './prompts/charts/V_plateau/examples/v_p-4.3.png',
      Vplateau: '4.3',
    },
    {
      filePath: './prompts/charts/V_plateau/examples/v_p-4.4.png',
      Vplateau: '4.4',
    },
    {
      filePath: './prompts/charts/V_plateau/examples/v_p-4.35.png',
      Vplateau: '4.35',
    },
    {
      filePath: './prompts/charts/V_plateau/examples/v_p-2.5.png',
      Vplateau: '2.5',
    },
    {
      filePath: './prompts/charts/V_plateau/examples/v_p-4.png',
      Vplateau: '4',
    },
  ];

  const exampleMessages: any = examples.flatMap((example) => [
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${fs
              .readFileSync(example.filePath)
              .toString('base64')}`,
          },
        },
      ],
    },
    {
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            Vplateau: example.Vplateau,
          }),
        },
      ],
    },
  ]);

  const filteredMessages = exampleMessages.filter(
    (message: any) =>
      !message.content.some((content: any) => content.type === 'image_url')
  );
  console.log(
    'Filtered example messages:',
    filteredMessages,
    JSON.stringify(filteredMessages, null, 2)
  );

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: VPlateauSystem,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: VPlateauUser,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
      ...exampleMessages,
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ],

    temperature: 0,
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices[0].message.content as string);
};

export const fixJson = async (result: string) => {
  console.log(`Attempting to fix JSON: ${result}`);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are an expert in JSON formatting. Please fix the following JSON formatting issues and return the fixed JSON: ${result}`,
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
    jsonOutput = null; // Handle the error appropriately
  }

  return jsonOutput;
};

export async function preselectImages(
  folderPath: string,
  model = 'gpt-4o-mini'
) {
  const imagesPath = folderPath + '/images';

  console.log(`Reading images from: ${imagesPath}`);
  const images = fs
    .readdirSync(imagesPath)
    .filter((file: string) => /\.(jpg|jpeg|png|gif)$/.test(file));

  console.log(`Found ${images.length} images to preselect.`);
  const content = images.map((image) => {
    const imagePath = path.join(imagesPath, image);
    console.log(`Processing image: ${imagePath}`);
    const base64Image = fs.readFileSync(imagePath).toString('base64');

    return {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `filename: ${image}`,
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${base64Image}`,
            detail: 'low',
          },
        },
      ],
    };
  });

  console.log(`Sending ${content.length} images for preselection.`);
  const PagesSelectionSystem = importMarkdownFile(
    'prompts/pagesSelection/PagesSelectionSystem.md'
  );
  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: PagesSelectionSystem,
      },
      ...(content as any),
    ],
    temperature: 0,
    response_format: { type: 'json_object' },
  });

  let jsonOutput;
  try {
    jsonOutput = JSON.parse(response.choices[0].message.content as string);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    jsonOutput = { omitted: [] }; // Handle the error appropriately
  }

  console.log(
    `Preselection complete. Returning parsed JSON.: ${JSON.stringify(
      jsonOutput
    )}`
  );

  const omittedFolderPath = path.join(imagesPath, 'omitted');

  // Check if the omitted folder exists, if not, create it
  if (!fs.existsSync(omittedFolderPath)) {
    fs.mkdirSync(omittedFolderPath, { recursive: true });
    console.log(`Created directory: ${omittedFolderPath}`);
  }

  jsonOutput.omitted
    .filter((filename: string) => !filename.includes('.1'))
    .forEach((filename: string) => {
      const sourcePath = path.join(imagesPath, filename);
      const destinationPath = path.join(omittedFolderPath, filename);

      if (fs.existsSync(sourcePath)) {
        fs.renameSync(sourcePath, destinationPath);
        console.log(`Moved ${filename} to omitted folder.`);
      } else {
        console.warn(`File ${filename} does not exist in images folder.`);
      }
    });

  return jsonOutput;
}

const countLLMCost_gpt4o = () => {
  const costPerFile = 0.1;
  let totalCost = 0;
  let totalFiles = 0;

  const manufacturers = fs.readdirSync(datasheetsFolderPath);

  manufacturers.forEach((mfr) => {
    const mfrPath = path.join(datasheetsFolderPath, mfr);
    if (fs.lstatSync(mfrPath).isDirectory()) {
      const files = fs.readdirSync(mfrPath);
      totalFiles += files.length;
      totalCost += files.length * costPerFile;
      console.log(`Manufacturer: ${mfr}, Number of files: ${files.length}`);
    }
  });

  console.log(`Total number of files: ${totalFiles}`);
  console.log(`Total LLM cost: $${totalCost.toFixed(2)}`);
};
