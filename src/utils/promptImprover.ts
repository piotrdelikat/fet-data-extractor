import fs from 'fs/promises';
import path from 'path';
import { anthropic, handleRateLimitError } from './anthropic/anthropic';
import {
  importMarkdownFile,
  requestController,
  clearJsonEnds,
} from './helpers';

async function getResponseFromAnthropicAPI(
  systemMessage: string,
  originalPrompt: string,
  inputText: string,
  outputText: string
): Promise<string> {
  const createMessageRequest = async () =>
    anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620', //'claude-3-haiku-20240307', //
      max_tokens: 8192, //4096,
      temperature: 0,
      system: systemMessage,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `# Original Prompt

              ${originalPrompt}

              # Input Text

              ${inputText}

              # Output Text

              ${outputText}

              # Improved Prompt

              Please provide an improved prompt based on the analysis of the original prompt, input text, and output text.`,
            },
          ],
        },
      ],
    });

  try {
    const response = await requestController(
      createMessageRequest(),
      'prompt improvement, Anthropic API'
    );
    return response.content[0].text;
  } catch (error: any) {
    console.error('Error in getResponseFromAnthropicAPI:', error);
    if (error.response && error.response.status === 429) {
      await handleRateLimitError(error.response);
      const retryResponse = await requestController(
        createMessageRequest(),
        'prompt improvement, Anthropic API'
      );
      return retryResponse.content[0].text;
    }
    throw error;
  }
}

async function constructPromptImprovementSystem(
  originalPrompt: string,
  inputTextPath: string,
  outputJsonPath: string
): Promise<void> {
  const systemMessage = await importMarkdownFile(
    'prompts/promptImprover/PromptImproverSystem.md'
  );
  const inputText = await fs.readFile(inputTextPath, 'utf-8');
  const outputJson = JSON.parse(await fs.readFile(outputJsonPath, 'utf-8'));
  const outputText = JSON.stringify(outputJson, null, 2);

  const improvedPrompt = await getResponseFromAnthropicAPI(
    systemMessage,
    originalPrompt,
    inputText,
    outputText
  );

  const candidateNumber = Date.now().toString().slice(-5).padStart(5, '0');
  const newPromptPath = path.join(
    'prompts/datasheetReading',
    `PromptImproverSystem_candidate_${candidateNumber}.md`
  );
  await fs.writeFile(newPromptPath, improvedPrompt);

  console.log(`Improved prompt saved as: ${newPromptPath}`);
}

export async function runPromptImprover(
  originalPromptPath: string = 'prompts/datasheetReading/DatasheetReadingSystem.md',
  rawTextPath: string = 'textOCR/nxp/BUK7E4R0-80E,127.txt',
  resultJsonPath: string = 'benchmark/nxp/PSMN3R5-80PS,127/llm_extract_ocr_text2_llama-3.1-70b-versatile.json'
): Promise<void> {
  try {
    const originalPrompt = await importMarkdownFile(originalPromptPath);

    await constructPromptImprovementSystem(
      originalPrompt,
      rawTextPath,
      resultJsonPath
    );
    console.log('Prompt improvement process completed successfully.');
  } catch (error) {
    console.error('Error in runPromptImprover:', error);
    throw error;
  }
}
