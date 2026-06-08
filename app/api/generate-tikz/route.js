import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL || process.env.CLAUDE_BASE_URL,
});

export async function POST(request) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'No image data provided' }, { status: 400 });
    }

    // Strip out the data URL prefix to get pure base64
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    const systemPrompt =
      "You are an expert LaTeX typesetter specializing in TikZ and CircuiTikZ. Analyze the provided diagram " +
      "and convert it into valid, compile-ready LaTeX TikZ code. Use elegant formatting and semantic " +
      "relative node positioning (e.g., right=of) instead of static coordinates where applicable. " +
      "For circuit elements, use CircuiTikZ syntax. For mathematical plots, use appropriate TikZ plot commands. " +
      "CRITICAL: Output ONLY the raw code block. Do not wrap it in markdown code fences like ```latex. " +
      "Start exactly with \\begin{tikzpicture} and end with \\end{tikzpicture}.";

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      temperature: 0.2,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: 'Convert this diagram to clean, elegant TikZ code. Use relative positioning and proper LaTeX conventions.',
            },
          ],
        },
      ],
    });

    let generatedCode = response.content[0]?.text?.trim() || '';

    // Clean up any markdown fences that might slip through
    generatedCode = generatedCode.replace(/```latex\n?/g, '').replace(/```\n?/g, '');

    return NextResponse.json({ code: generatedCode });

  } catch (error) {
    console.error("Claude API Error:", error);
    return NextResponse.json({
      error: error.message || 'Internal Server Error processing AI request'
    }, { status: 500 });
  }
}
