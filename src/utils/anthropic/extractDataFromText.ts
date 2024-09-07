import fs from 'fs';
import path from 'path';
import { anthropic, handleRateLimitError } from './anthropic';
import {
  clearJsonEnds,
  createLogEntryOnError,
  importMarkdownFile,
  requestController,
} from '../helpers';
import { fixJson } from '../openAI/openAI';

export async function readValuesFromTextAnthropic(
  textFilePath: string,
  model = 'claude-3-5-sonnet-20240620'
) {
  console.log(`Reading text from: ${textFilePath}`);

  try {
    const textContent = fs.readFileSync(textFilePath, 'utf-8');

    const exampleOutputFile = `./prompts/datasheetReading/examples/llm_extract_claude-3-5-sonnet-20240620.json`;
    const exampleAnswers = JSON.parse(
      fs.readFileSync(exampleOutputFile, 'utf-8')
    );

    const DataSheetReadingSystem = importMarkdownFile(
      'prompts/datasheetReading/DatasheetReadingSystem.md'
    );
    const DataSheetReadingUser = importMarkdownFile(
      'prompts/datasheetReading/DatasheetReadingTextUser.md'
    );

    const createMessageRequest = async () =>
      anthropic.messages.create({
        model,
        max_tokens: model.includes('claude-3-5-sonnet') ? 8192 : 4096,
        temperature: 0,
        system: DataSheetReadingSystem,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: DataSheetReadingUser,
              },
            ],
          },
          {
            role: 'assistant',
            content: [
              {
                type: 'text',
                text: JSON.stringify(exampleAnswers),
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: textContent,
              },
            ],
          },
        ],
      });

    let response: any;
    try {
      response = await requestController(
        createMessageRequest(),
        'text to JSON, Anthropic API'
      );
    } catch (error: any) {
      console.error('Error in readValuesFromTextAnthropic:', error);
      if (error.response && error.response.status === 429) {
        await handleRateLimitError(error.response);
        response = await requestController(
          createMessageRequest(),
          'text to JSON, Anthropic API'
        );
      } else {
        createLogEntryOnError(
          textFilePath,
          model,
          `Error in readValuesFromTextAnthropic:', ${error}`
        );
      }
    }

    // Save JSON response
    let jsonOutput;
    try {
      jsonOutput = JSON.parse(clearJsonEnds(response.content[0].text));
    } catch (error) {
      console.error('Error parsing JSON:', error);
      jsonOutput = await fixJson(clearJsonEnds(response.content[0].text));
    }

    return jsonOutput;
  } catch (error) {
    console.error('Error in readValuesFromTextAnthropic:', error);
  }
}
