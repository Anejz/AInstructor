const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const { OpenAI } = require('openai');
const dotenv = require('dotenv');



dotenv.config();
const app = express();
const openai = new OpenAI();

app.get('/favicon.ico', (req, res) => res.status(204)); // Send a No Content response

app.use(cors());
app.use(express.static('public'));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/transcribe', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const tempFilePath = `uploads/${req.file.originalname}`;

    if (!fs.existsSync('uploads')) {
        fs.mkdirSync('uploads');
    }

    fs.writeFileSync(tempFilePath, req.file.buffer);

    try {
        const language = req.body.language;
        const transcriptionOptions = {
            file: fs.createReadStream(tempFilePath),
            model: "whisper-1"
        };

        if (language && language !== 'none') {
            transcriptionOptions.language = language;
        }

        const transcription = await openai.audio.transcriptions.create(transcriptionOptions);
        

        // Delete the temporary file after use
        fs.unlinkSync(tempFilePath);

        res.json({ transcription: transcription.text });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error during transcription');
    }
});
app.use(express.json());
app.post('/reformulate', async (req, res) => {
    const { transcription } = req.body;

    try {
        const response = await openai.chat.completions.create({
            messages: [{ role: "system", content: "You are a lector. Restructure this text. Fix any grammar errors and formulate the text. Use the same language as in the original text." },
                       { role: "user", content: transcription }],
            model: "gpt-3.5-turbo-1106",
        });

        const refinedText = response.choices[0].message.content;
        res.json({ refinedTranscription: refinedText });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error processing request');
    }
});

app.post('/save-transcription', async (req, res) => {
    const { transcription, filename } = req.body;

    if (!transcription || !filename) {
        return res.status(400).json({ error: 'Missing transcription or filename' });
    }

    const filePath = `saved_transcriptions/${filename}.txt`;

    try {
        if (!fs.existsSync('saved_transcriptions')) {
            fs.mkdirSync('saved_transcriptions');
        }

        fs.writeFileSync(filePath, transcription);
        res.json({ message: 'Transcription saved successfully' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error saving transcription');
    }
});
app.get('/list-saved-transcriptions', (req, res) => {
    const directoryPath = 'saved_transcriptions';

    fs.readdir(directoryPath, (err, files) => {
        if (err) {
            console.error('Error listing files:', err);
            return res.status(500).send('Error listing files');
        }
        res.json({ files });
    });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

app.post('/process-transcript', async (req, res) => {
    const { action, transcription } = req.body;
    try {
        let response;
        switch (action) {
            case 'reformulate':
                response = await openai.chat.completions.create({
                    messages: [{ role: "system", content: "You are a lector. Restructure this text. Fix any grammar errors and formulate the text" },
                               { role: "user", content: transcription }],
                    model: "gpt-3.5-turbo-1106",
                });
                break;
            case 'generate-questions':
                response = await openai.chat.completions.create({
                    messages: [{ role: "system", content: "You are a tutor. Generate study questions based on the following text." },
                               { role: "user", content: transcription }],
                    model: "gpt-3.5-turbo-1106",
                });
                break;
            case 'generate-notes':
                response = await openai.chat.completions.create({
                    messages: [{ role: "system", content: "You are a note-taker. Summarize the following text into key points and concepts. Write with breaks and bulletpoints. Always write <br> before -" },
                               { role: "user", content: transcription }],
                    model: "gpt-3.5-turbo-1106",
                });
                break;
            default:
                throw new Error('Invalid action');
        }

        const gptResponse = response?.choices[0].message.content || 'No response from GPT';
        res.json({ gptResponse });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error processing request');
    }
});
async function fetchAssistantResponse(threadId) {
    let attempts = 0;
    const maxAttempts = 10; // Maximum number of polling attempts
    const interval = 5000; // Interval between attempts in milliseconds

    while (attempts < maxAttempts) {
        const messagesResponse = await openai.beta.threads.messages.list(threadId);
        const assistantMessages = messagesResponse.data.filter(msg => msg.role === 'assistant');

        if (assistantMessages.length > 0) {
            // Return the latest assistant message
            return assistantMessages[assistantMessages.length - 1];
        }

        await new Promise(resolve => setTimeout(resolve, interval));
        attempts++;
    }

    throw new Error('No response from the assistant after maximum attempts');
}
// [Existing server.js code]
// Assuming express and openai are already set up
app.post('/chat', async (req, res) => {
    const { message } = req.body;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo-1106", // Specify the model here
            messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: message }
            ],
        });

        console.log(completion.choices[0]);
        res.json({ reply: completion.choices[0].message.content });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});


