import fs from 'fs';
import path from 'path';
import { anthropic, handleRateLimitError } from './anthropic';
import { importMarkdownFile } from '../helpers';
import { fixJson } from '../openAI/openAI';

export const readVplateauAnthropic = async (
  imagesPath: string,
  imageFileName: string,
  model: string = 'claude-3-5-sonnet-20240620'
) => {
  try {
    const filePath = path.join(imagesPath, imageFileName);
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
        Vplateau: '4.0',
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
        Vplateau: '4.3',
      },
      {
        filePath: './prompts/charts/V_plateau/examples/v_p-2.5.png',
        Vplateau: '2.5',
      },
      {
        filePath: './prompts/charts/V_plateau/examples/v_p-4.png',
        Vplateau: '4.0',
      },
    ];

    const content: any[] = [];

    for (const example of examples) {
      const exampleBase64 = fs
        .readFileSync(example.filePath)
        .toString('base64');
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: exampleBase64,
        },
      });
      content.push({
        type: 'text',
        text: JSON.stringify({ Vplateau: example.Vplateau }),
      });
    }

    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/png',
        data: base64Image,
      },
    });
    const createMessageRequest = () =>
      anthropic.messages.create({
        model,
        max_tokens: 1024,
        temperature: 0,
        system: VPlateauSystem,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: VPlateauUser,
              },
              ...content,
            ],
          },
        ],
      });

    let response: any;
    try {
      response = await createMessageRequest();
    } catch (error: any) {
      console.error('Error reading V_plateau with Anthropic API:', error);
      if (error.response && error.response.status === 429) {
        await handleRateLimitError(error.response);
        response = await createMessageRequest();
      } else {
        throw error;
      }
    }

    let jsonOutput;
    try {
      jsonOutput = JSON.parse(response.content[0].text);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      jsonOutput = await fixJson(response.content[0].text);
    }

    return jsonOutput;
  } catch (error) {
    console.error('Error reading V_plateau:', error);
  }
};
