import fs from 'fs';
import path from 'path';
import { anthropic, handleRateLimitError } from './anthropic';
import { importMarkdownFile } from '../helpers';
import { fixJson } from '../openAI/openAI';

export async function preselectPagesAnthropic(
  folderPath: string,
  model = 'claude-3-haiku-20240307'
) {
  const imagesPath = folderPath;
  console.log(`Reading images from: ${imagesPath}`);
  const images = fs
    .readdirSync(imagesPath)
    .filter((file: string) => /\.(jpg|jpeg|png|gif|webp)$/.test(file));

  console.log(`Found ${images.length} images to preselect.`);
  const content: any = [];

  for (const image of images) {
    const imagePath = path.join(imagesPath, image);
    console.log(`Processing image: ${imagePath}`);
    const base64Image = fs.readFileSync(imagePath).toString('base64');

    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: `image/${path.extname(image).slice(1)}`,
        data: base64Image,
      },
    });
    content.push({
      type: 'text',
      text: `filename: ${image}`,
    });
  }
  // Read example images and outputs
  const examplesPath = 'prompts/pagesSelection/examples';
  const exampleFolders = fs.readdirSync(examplesPath);

  const exampleMessages: any[] = [];

  for (const folder of exampleFolders) {
    const folderPath = path.join(examplesPath, folder);
    if (fs.statSync(folderPath).isDirectory()) {
      const imagesPath = path.join(folderPath, 'images');
      const examplesImages = fs
        .readdirSync(imagesPath)
        .filter((file: string) => /\.(jpg|jpeg|png|gif|webp)$/.test(file));

      const exampleImageContent: any[] = [];

      for (const image of examplesImages) {
        const imagePath = path.join(imagesPath, image);
        const base64Image = fs.readFileSync(imagePath).toString('base64');

        exampleImageContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: `image/${path.extname(image).slice(1)}`,
            data: base64Image,
          },
        });
        exampleImageContent.push({
          type: 'text',
          text: `filename: ${image}`,
        });
      }

      // Read example output
      const exampleOutputFile = path.join(
        folderPath,
        'preselectionResult.json'
      );
      const exampleAnswer = JSON.parse(
        fs.readFileSync(exampleOutputFile, 'utf-8')
      );

      exampleMessages.push(
        { role: 'user', content: exampleImageContent },
        {
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: JSON.stringify(exampleAnswer),
            },
          ],
        }
      );
    }
  }

  const PagesSelectionSystem = importMarkdownFile(
    'prompts/pagesSelection/PagesSelectionSystem.md'
  );

  const createMessageRequest = () =>
    anthropic.messages.create({
      model,
      max_tokens: model.includes('claude-3-5-sonnet') ? 8192 : 4096,
      temperature: 0,
      system: PagesSelectionSystem,
      messages: [
        ...exampleMessages,
        {
          role: 'user',
          content: content,
        },
      ],
    });

  let response: any;
  try {
    response = await createMessageRequest();
  } catch (error: any) {
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

  console.log(
    `Preselection complete. Returning parsed JSON: ${JSON.stringify(
      jsonOutput
    )}`
  );

  //let preselectionResult = {
  //   dataPages: ['path/1.png', 'path/2.png', 'path/3.png'],
  //   chartPages: {
  //     V_plateau: 'path/1.png',
  //   },
  //   dimentionsPages: ['path/1.png', 'path/2.png', 'path/3.png'],
  // };

  return jsonOutput;
}
