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


