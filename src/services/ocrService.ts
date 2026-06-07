import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export async function processExpenseFile(file: File): Promise<any> {
  // Convert file to base64
  const base64Data = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

  const prompt = `Extract expenses from this receipt. Return ONLY a JSON array of objects with the following structure:
  [
    { "item": "string", "amount": number, "date": "string" }
  ]
  If no date is found, use the current date. Ensure amount is a number.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview", // Use a valid model from SKILL.md
    contents: {
        parts: [
            { text: prompt },
            {
                inlineData: {
                    data: base64Data.split(",")[1],
                    mimeType: file.type,
                },
            },
        ]
    },
  });

  const responseText = response.text || "";
  const jsonMatch = responseText.match(/\[.*\]/s);
  
  if (!jsonMatch) {
    throw new Error("Failed to parse OCR response");
  }

  return JSON.parse(jsonMatch[0]);
}
