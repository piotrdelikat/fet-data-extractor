import fs from 'fs';
import path from 'path';
import { importMarkdownFile } from '../helpers';
import openai, { fixJson } from './openAI';

export async function preselectPagesOpenAI(
  folderPath: string,
  model = 'gpt-4o-mini'
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
      type: 'image_url',
      image_url: {
        url: `data:image/${path.extname(image).slice(1)};base64,${base64Image}`,
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
          type: 'image_url',
          image_url: {
            url: `data:image/${path
              .extname(image)
              .slice(1)};base64,${base64Image}`,
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
        { role: 'assistant', content: JSON.stringify(exampleAnswer) }
      );
    }
  }

  const PagesSelectionSystem = importMarkdownFile(
    'prompts/pagesSelection/PagesSelectionSystem.md'
  );

  const createMessageRequest = () =>
    openai.chat.completions.create({
      model,
      max_tokens: 4096,
      temperature: 0,
      messages: [
        { role: 'system', content: PagesSelectionSystem },
        ...exampleMessages,
        { role: 'user', content: content },
      ],
    });

  let response: any;
  try {
    response = await createMessageRequest();
  } catch (error: any) {
    if (error.response && error.response.status === 429) {
      console.log('Rate limit reached. Retrying after a delay...');
      await new Promise((resolve) => setTimeout(resolve, 60000)); // Wait for 1 minute
      response = await createMessageRequest();
    } else {
      throw error;
    }
  }

  let jsonOutput;
  try {
    jsonOutput = JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    jsonOutput = await fixJson(response.choices[0].message.content);
  }

  console.log(
    `Preselection complete. Returning parsed JSON: ${JSON.stringify(
      jsonOutput
    )}`
  );

  return jsonOutput;
}
