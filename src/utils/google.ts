import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require('@google/generative-ai/server');

const apiKey = process.env.GEMINI_API_KEY;
export const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

async function uploadToGemini(path: string, mimeType: string) {
  const uploadResult = await fileManager.uploadFile(path, {
    mimeType,
    displayName: path,
  });
  const file = uploadResult.file;
  console.log(`Uploaded file ${file.displayName} as: ${file.name}`);
  return file;
}

export const extractWihGoogleGemini = async (imagesPath: string) => {
  const modelName = 'gemini-1.5-flash';

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction:
      "You are an expert in reading and analyzing specifications of electronic components. \n          IMPORTANT:\n            When processing tabular data, always save each column as a separate key, including the column name in the key.\n            Pay special attention to the columns labeled Min, Typ, and Max and make sure that these values are accurately identified annd stored. It is crucial that these values are accurately saved with their respective keys: 'min', 'typ', or 'max'. \n            If no value is specified, save it as 'null'.\n            This is especially important for the success of the program to that the column data is accurately extracted and stored with the correct keys.\n            \n          \n          Format the output strictly as JSON and do NOT include the example provided below in the output file.",
  });

  const prompt = `Please analyze these images of electrical components and extract all relevant values such as componentName, manufacturer, specifications, and any other pertinent details. 
            Make sure that all values are extracted including, symbols, units, test conditions and any other relevant information.
            
            IMPORTANT:
            When processing tabular data, always save each column as a separate key, including the column name in the key. If no value is specified, save it as 'null'.
            Pay special attention to the values in the columns labeled Min, Typ, and Max. It is crucial that these values are accurately identified and saved with their respective keys: 'min', 'typ', and 'max'. 
            This is especially important to maintain the integrity of the data.
            
            Please format the output as JSON and do NOT include the example provided below in the output file.`;

  const generationConfig = {
    temperature: 0,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
    responseMimeType: 'application/json',
  };

  const examplesPath = `./src/utils/examples`;
  const examples = fs
    .readdirSync(examplesPath)
    .filter((file) => /\.(jpg|jpeg|png|gif)$/.test(file));

  const exampleFiles = [];

  for (const exampleImage of examples) {
    const imagePath = path.join(examplesPath, exampleImage);
    console.log(`Processing example image: ${imagePath}`);

    exampleFiles.push(await uploadToGemini(imagePath, 'image/png'));
  }

  const images = fs
    .readdirSync(imagesPath)
    .filter((file) => /\.(jpg|jpeg|png|gif)$/.test(file));

  console.log(`Found ${images.length} images to analyze.`);
  const files = [];

  for (const image of images) {
    const imagePath = path.join(imagesPath, image);
    console.log(`Processing image: ${imagePath}`);

    files.push(await uploadToGemini(imagePath, 'image/png'));
  }

  const chatSession = model.startChat({
    generationConfig,
    history: [
      {
        role: 'user',
        parts: [
          ...exampleFiles.map((file) => ({
            fileData: {
              mimeType: 'image/png',
              fileUri: file.uri,
            },
          })),
        ],
      },
      {
        role: 'model',
        parts: [
          {
            text: '{\n  "componentName": "AP80N08D",\n  "manufacturer": "APM Microelectronics",\n  "description": "80V N-Channel Enhancement Mode MOSFET",\n  "generalFeatures": {\n    "V_DS": "80V",\n    "I_D": "80A",\n    "R_DS(on)": "< 6.5mΩ @ V_GS=10V"\n  },\n  "application": [\n    "Battery protection",\n    "Load switch",\n    "Uninterruptible power supply"\n  ],\n  "packageMarkingAndOrderingInformation": {\n    "productID": "AP80N08D",\n    "pack": "TO-252-3L",\n    "marking": "AP80N08D XXX YYYY",\n    "qty(PCS)": 2500\n  },\n  "absoluteMaximumRatings": {\n    "V_DS": { "parameter": "Drain-Source Voltage", "rating": 80, "units": "V" },\n    "V_GS": {\n      "parameter": "Gate-Source Voltage",\n      "rating": "±20",\n      "units": "V"\n    },\n    "I_D@T_C=25°C": {\n      "parameter": "Continuous Drain Current, V_GS @ 10V",\n      "rating": 80,\n      "units": "A"\n    },\n    "I_D@T_C=100°C": {\n      "parameter": "Continuous Drain Current, V_GS @ 10V",\n      "rating": 42.5,\n      "units": "A"\n    },\n    "I_DM": {\n      "parameter": "Pulsed Drain Current",\n      "rating": 170,\n      "units": "A"\n    },\n    "E_AS": {\n      "parameter": "Single Pulse Avalanche Energy",\n      "rating": 57.8,\n      "units": "mJ"\n    },\n    "I_AS": { "parameter": "Avalanche Current", "rating": 34, "units": "A" },\n    "P_D@T_C=25°C": {\n      "parameter": "Total Power Dissipation",\n      "rating": 56,\n      "units": "W"\n    },\n    "T_STG": {\n      "parameter": "Storage Temperature Range",\n      "rating": "-55 to 150",\n      "units": "°C"\n    },\n    "T_J": {\n      "parameter": "Operating Junction Temperature Range",\n      "rating": "-55 to 150",\n      "units": "°C"\n    },\n    "R_θJA": {\n      "parameter": "Thermal Resistance Junction-Ambient",\n      "rating": 62,\n      "units": "°C/W"\n    },\n    "R_θJC": {\n      "parameter": "Thermal Resistance Junction-Case",\n      "rating": 2.2,\n      "units": "°C/W"\n    }\n  },\n  "electricalCharacteristics": {\n    "BV_DSS": {\n      "parameter": "Drain-Source Breakdown Voltage",\n      "conditions": "V_GS=0V, I_D=250μA",\n      "min": 80,\n      "typ": null,\n      "max": null,\n      "unit": "V"\n    },\n    "R_DS(on)_1": {\n      "parameter": "Static Drain-Source On-Resistance",\n      "conditions": "V_GS=10V, I_D=20A",\n      "min": null,\n      "typ": 4.8,\n      "max": 6.5,\n      "unit": "mΩ"\n    },\n    "R_DS(on)_2": {\n      "parameter": "Static Drain-Source On-Resistance",\n      "conditions": "V_GS=4.5V, I_D=20A",\n      "min": null,\n      "typ": 6.3,\n      "max": 8.5,\n      "unit": "mΩ"\n    },\n    "V_GS(th)": {\n      "parameter": "Gate Threshold Voltage",\n      "conditions": "V_DS=V_GS, I_D=250μA",\n      "min": 1,\n      "typ": null,\n      "max": 2.5,\n      "unit": "V"\n    },\n    "I_DSS": {\n      "parameter": "Drain-Source Leakage Current",\n      "conditions": "V_DS=64V, V_GS=0V, T_J=25°C",\n      "min": null,\n      "typ": null,\n      "max": 1,\n      "unit": "μA"\n    },\n    "I_DSS_2": {\n      "parameter": "Drain-Source Leakage Current",\n      "conditions": "V_DS=64V, V_GS=0V, T_J=55°C",\n      "min": null,\n      "typ": null,\n      "max": 5,\n      "unit": "μA"\n    },\n    "I_GSS": {\n      "parameter": "Gate-Source Leakage Current",\n      "conditions": "V_GS=±20V, V_DS=0V",\n      "min": null,\n      "typ": null,\n      "max": "±100",\n      "unit": "nA"\n    },\n    "g_fs": {\n      "parameter": "Forward Transconductance",\n      "conditions": "V_DS=5V, I_D=20A",\n      "min": null,\n      "typ": 75,\n      "max": null,\n      "unit": "S"\n    },\n    "R_g": {\n      "parameter": "Gate Resistance",\n      "conditions": "V_DS=0V, V_GS=0V, f=1MHz",\n      "min": null,\n      "typ": 0.5,\n      "max": null,\n      "unit": "Ω"\n    },\n    "Q_g": {\n      "parameter": "Total Gate Charge (10V)",\n      "conditions": "V_DS=40V, V_GS=10V, I_D=20A",\n      "min": null,\n      "typ": 40,\n      "max": null,\n      "unit": "nC"\n    },\n    "Q_gs": {\n      "parameter": "Gate-Source Charge",\n      "conditions": "V_DS=40V, V_GS=10V, I_D=20A",\n      "min": null,\n      "typ": 7.2,\n      "max": null,\n      "unit": "nC"\n    },\n    "Q_gd": {\n      "parameter": "Gate-Drain Charge",\n      "conditions": "V_DS=40V, V_GS=10V, I_D=20A",\n      "min": null,\n      "typ": 6.5,\n      "max": null,\n      "unit": "nC"\n    },\n    "T_d(on)": {\n      "parameter": "Turn-On Delay Time",\n      "conditions": "V_DD=40V, V_GS=10V, R_G=3Ω, I_D=20A",\n      "min": null,\n      "typ": 8.3,\n      "max": null,\n      "unit": "ns"\n    },\n    "T_r": {\n      "parameter": "Rise Time",\n      "conditions": "V_DD=40V, V_GS=10V, R_G=3Ω, I_D=20A",\n      "min": null,\n      "typ": 4.2,\n      "max": null,\n      "unit": "ns"\n    },\n    "T_d(off)": {\n      "parameter": "Turn-Off Delay Time",\n      "conditions": "V_DD=40V, V_GS=10V, R_G=3Ω, I_D=20A",\n      "min": null,\n      "typ": 36,\n      "max": null,\n      "unit": "ns"\n    },\n    "T_f": {\n      "parameter": "Fall Time",\n      "conditions": "V_DD=40V, V_GS=10V, R_G=3Ω, I_D=20A",\n      "min": null,\n      "typ": 6.9,\n      "max": null,\n      "unit": "ns"\n    },\n    "C_iss": {\n      "parameter": "Input Capacitance",\n      "conditions": "V_DS=40V, V_GS=0V, f=1MHz",\n      "min": null,\n      "typ": 2860,\n      "max": null,\n      "unit": "pF"\n    },\n    "C_oss": {\n      "parameter": "Output Capacitance",\n      "conditions": "V_DS=40V, V_GS=0V, f=1MHz",\n      "min": null,\n      "typ": 410,\n      "max": null,\n      "unit": "pF"\n    },\n    "C_rss": {\n      "parameter": "Reverse Transfer Capacitance",\n      "conditions": "V_DS=40V, V_GS=0V, f=1MHz",\n      "min": null,\n      "typ": 38,\n      "max": null,\n      "unit": "pF"\n    },\n    "I_S": {\n      "parameter": "Continuous Source Current",\n      "conditions": "V_G=V_D=0V, Force Current",\n      "min": null,\n      "typ": 48,\n      "max": null,\n      "unit": "A"\n    },\n    "V_SD": {\n      "parameter": "Diode Forward Voltage",\n      "conditions": "V_GS=0V, I_S=A, T_J=25°C",\n      "min": null,\n      "typ": 0.77,\n      "max": 1,\n      "unit": "V"\n    },\n    "T_rr": {\n      "parameter": "Reverse Recovery Time",\n      "conditions": "I_F=20A, dI/dt=100A/μs, T_J=25°C",\n      "min": null,\n      "typ": 27,\n      "max": null,\n      "unit": "ns"\n    },\n    "Q_rr": {\n      "parameter": "Reverse Recovery Charge",\n      "conditions": "I_F=20A, dI/dt=100A/μs, T_J=25°C",\n      "min": null,\n      "typ": 89,\n      "max": null,\n      "unit": "nC"\n    }\n  }\n}\n',
          },
        ],
      },
      {
        role: 'user',
        parts: [
          ...files.map((file) => ({
            fileData: {
              mimeType: 'image/png',
              fileUri: file.uri,
            },
          })),
        ],
      },
    ],
  });

  const result = await chatSession.sendMessage(prompt);
  console.log(result.response.text());

  const jsonOutput = JSON.parse(result.response.text());
  const jsonFolderPath = imagesPath.replace('images', '');

  const outputFileName = `llm_extract_${modelName}.json`;

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
};
