import fs from 'fs';
import path from 'path';
import openai, { fixJson } from './openAI';
import {
  clearJsonEnds,
  createLogEntryOnError,
  importMarkdownFile,
  requestController,
} from '../helpers';
import groqOpenAI from '../groq/groq';

export async function readValuesFromTextOpenAI(
  textFilePath: string,
  model = 'gpt-4o-mini',
  api = 'OpenAI'
) {
  console.log(`Reading text from: ${textFilePath}`);

  try {
    const textContent = fs.readFileSync(textFilePath, 'utf-8');

    const exampleTextFile = `./prompts/datasheetReading/examples/EPC7018GC.txt`;

    const exampleOutputFile = `./prompts/datasheetReading/examples/llm_extract_claude-3-5-sonnet-20240620.json`;
    const exampleAnswers = JSON.parse(
      fs.readFileSync(exampleOutputFile, 'utf-8')
    );

    const DataSheetReadingSystem = importMarkdownFile(
      'prompts/datasheetReading/DatasheetReadingSystem.md'
    );

    const api = model.includes('gpt') ? openai : groqOpenAI;

    const createMessageRequest = () => {
      return api.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: DataSheetReadingSystem,
          },
          {
            role: 'user',
            content: exampleTextFile,
          },
          {
            role: 'assistant',
            content: JSON.stringify(exampleAnswers),
          },
          {
            role: 'user',
            content: textContent,
          },
        ],
        temperature: 0,

        max_tokens: 8000, //4096,
        response_format: api === openai ? { type: 'json_object' } : undefined,
      });
    };

    let response: any;
    try {
      response = await requestController(
        createMessageRequest(),
        `text to JSON, ${api} API`
      );
    } catch (error: any) {
      console.error('Error in readValuesFromTextOpenAI:', error);
      if (error.response && error.response.status === 429) {
        // await handleRateLimitError(error.response); TODO
        response = await requestController(
          createMessageRequest(),
          `text to JSON, ${api} API`
        );
      } else {
        createLogEntryOnError(
          textFilePath,
          model,
          `Error in readValuesFromTextOpenAI: ${error}`
        );
        return;
      }
    }

    let jsonOutput;
    try {
      jsonOutput = JSON.parse(
        clearJsonEnds(response.choices[0].message.content)
      );
    } catch (error) {
      console.error('Error parsing JSON:', error);
      jsonOutput = await fixJson(
        clearJsonEnds(response.choices[0].message.content)
      );
    }

    return jsonOutput;
  } catch (error) {
    console.error('Error in readValuesFromTextOpenAI:', error);
    createLogEntryOnError(
      textFilePath,
      model,
      `Error in readValuesFromTextOpenAI: ${error}`
    );
  }
}
