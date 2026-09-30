const OpenAI = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-key-here',
});
async function main() {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'test' }],
    });
    console.log('SUCCESS:', completion.choices[0].message.content);
  } catch (e) {
    console.error('ERROR:', e.message);
  }
}
main();
