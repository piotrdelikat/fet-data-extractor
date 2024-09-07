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
  console.log(`Attempting to fix JSON output`);

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
