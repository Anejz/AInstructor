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

// [Existing server.js code]
// Assuming express and openai are already set up
app.post('/chat', async (req, res) => {
    const { message } = req.body;

    try {
        // Step 1: Create an Assistant (if not already created)
        // This can be done once and the ID stored, or you can create a new one for each conversation
        const assistant = await openai.beta.assistants.create({
            name: "General Assistant",
            instructions: "You are a helpful assistant.",
            model: "gpt-4-1106-preview"
        });

        // Step 2: Create a Thread for the conversation
        const thread = await openai.beta.threads.create();

        // Step 3: Add the user's message to the Thread
        await openai.beta.threads.runs.create(thread.id, {
            assistant_id: assistant.id
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Retrieve the Assistant's response
        const messagesResponse = await openai.beta.threads.messages.list(thread.id);
        const assistantMessages = messagesResponse.data.filter(msg => msg.role === 'assistant');

        if (assistantMessages.length > 0) {
            const latestMessage = assistantMessages[assistantMessages.length - 1];
            
            // Check if the message content is an array with the expected structure
            if (Array.isArray(latestMessage.content) && latestMessage.content.length > 0 && latestMessage.content[0].text) {
                const latestResponse = latestMessage.content[0].text.value;
                res.json({ reply: latestResponse });
            } else {
                console.error('Unexpected message content structure:', latestMessage);
                res.status(500).send('Unexpected message content structure');
            }
        } else {
            console.error("No response from the Assistant in the Thread.");
            res.status(500).send('No response from the Assistant');
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});


