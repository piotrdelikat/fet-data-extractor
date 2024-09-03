import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';
import { sleep, importMarkdownFile } from '../helpers';
import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  // defaults to process.env["ANTHROPIC_API_KEY"]
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const calculateAnthropicTokens = (width: number, height: number) => {
  return (width * height) / 750;
};

export const calculateAnthropicImagePrice = (
  width: number,
  height: number
): number => {
  const tokens = calculateAnthropicTokens(width, height);
  const pricePerMillionTokens = 3; // $3 per million tokens
  return (tokens / 1000000) * pricePerMillionTokens;
};

// 100 // hundred
// 1000 // thousand
// 10 000 // ten thousand
// 100 000 // hundred thousand
// 1000 000 // million
// 10 000 000 // ten million
// 100 000 000 // hundred million
// 1 000 000 000 // billion

export async function handleRateLimitError(response: any) {
  const retryAfter = response.headers['retry-after'];
  if (retryAfter) {
    console.log(`Rate limit exceeded. Retrying after ${retryAfter} seconds.`);
    await sleep(retryAfter * 1000); // Convert to milliseconds
  } else {
    console.error('Rate limit error, but no retry-after header found.');
  }
}
