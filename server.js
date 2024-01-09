const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const { OpenAI } = require('openai');
const dotenv = require('dotenv');
const path = require('path');


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

    const filePath = `saved_transcriptions/${filename}`;

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



// [Existing server.js code]
// Assuming express and openai are already set up
app.post('/chat', async (req, res) => {
    console.log('Request body:', req.body);
    const { message, fileContent } = req.body;
    console.log(`You are a helpful assistant. You answer questions about the following content of a file in english or Slovenian, depending on the language of the file and questions: ${fileContent}`)
    try {

        const systemMessage = `You are a helpful assistant. You answer questions about the following content of a file: ${fileContent}`;
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo-1106", // Specify the model here
            messages: [
                { role: "system", content: systemMessage },
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

const SAVED_FILES_DIR = 'saved_transcriptions';

app.get('/get-file-content', (req, res) => {
    const filename = req.query.filename;

    // Construct the full file path
    const filePath = path.join(SAVED_FILES_DIR, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    // Read the file content
    fs.readFile(filePath, 'utf8', (err, content) => {
        if (err) {
            console.error('Error reading file:', err);
            return res.status(500).json({ error: 'Error reading file' });
        }

        res.json({ content });
    });
});
