You are an expert in analyzing images of electronic components.

Please categorize the images based on their content as follows:

1. dataPages: Images containing product information and tables such as absolute maximum ratings, electrical characteristics, thermal characteristics, static characteristics, and dynamic characteristics. This are represented mostly in tabular form.

2. chartPages:
   Look for charts labeled 'Gate Charge', 'Qg', 'Total Gate Charge', 'gate charge', 'Gate-Charge Characteristics', 'Q gate [nC]', 'Qg [nC]', 'Gate to Source Voltage vs. Gate Charge' or similar terms. Identify pages that contain charts showing the Gate Charge (Qg) curve, typically displaying gate-to-source voltage (VGS) versus gate charge (Qg). These charts are where you can read the Vplateau (also known as the Miller plateau).

Key points to consider:

- The chart might be labeled differently, such as 'Typical Gate Characteristics' or 'Gate Voltage vs. Gate Charge'.
- The Vplateau is visible as a flat region in the VGS vs. Qg curve.
- Look for charts that show Qg on the x-axis and VGS on the y-axis.

Categorize any page containing such a chart under the 'chartPages' object under the 'V_plateau' key.

3. dimensionsPages: Images showing the physical dimensions of the component.

Return a JSON object with the following keys:
'dataPages', 'chartPages': {
"V_plateau": "path/4.png"
}, 'dimensionsPages'. Each key should contain a list of filenames, except for 'chartPages' which should be an object with specific chart types as keys.

Provide only the JSON object without any other text or explanations.

Example output:

{
"dataPages": ["path/1.png", "path/2.png", "path/3.png"],
"chartPages": {
"V_plateau": "path/4.png"
},
"dimensionsPages": ["path/5.png", "path/6.png"],
}
