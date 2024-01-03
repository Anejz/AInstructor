// script.js
document.getElementById('upload-form').addEventListener('submit', function(e) {
    e.preventDefault();

    document.getElementById('loading-spinner').classList.remove('d-none');


    document.getElementById('progress-container').classList.remove('d-none');
    updateProgressBar(0);

    const formData = new FormData();
    formData.append('file', document.getElementById('fileUpload').files[0]);

    const language = document.getElementById('language').value;
    if (language) {
        formData.append('language', language);
    }
    fetch('/transcribe', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        updateProgressBar(100);
        document.getElementById('loading-spinner').classList.add('d-none');
        return response.json();
    })
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        document.getElementById('transcription-textarea').textContent = data.transcription;
        document.getElementById('error-message').classList.add('d-none');
    })
    .catch(error => {
        updateProgressBar(0);
        document.getElementById('loading-spinner').classList.add('d-none');
        console.error('Error:', error);
        document.getElementById('error-message').textContent = error.message;
        document.getElementById('error-message').classList.remove('d-none');
    });
});

function updateProgressBar(percent) {
    const progressBar = document.getElementById('progress-bar');
    progressBar.style.width = percent + '%';
    progressBar.setAttribute('aria-valuenow', percent);
}

// Audio Playback
document.getElementById('fileUpload').addEventListener('change', function(event) {
    const audioPlayer = document.getElementById('audioPlayback');
    const file = event.target.files[0];
    if (file) {
        audioPlayer.src = URL.createObjectURL(file);
        audioPlayer.hidden = false;
    }
});

// Audio Recording
let mediaRecorder;
let audioChunks = [];

document.getElementById('startRecording').addEventListener('click', function() {
    navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
        console.log("Stream active:", stream.active); // Debugging log
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' }); // Set MIME type explicitly
        audioChunks = [];

        mediaRecorder.ondataavailable = event => {
            console.log("Data available:", event.data.size); // Debugging log
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.start(1000); // Use timeslice

        document.getElementById('stopRecording').disabled = false;
    })
    .catch(err => {
        console.error("Error accessing the microphone: ", err);
        alert("Error accessing the microphone: " + err.message);
    });
});

document.getElementById('stopRecording').addEventListener('click', function() {
    mediaRecorder.stop();
    document.getElementById('stopRecording').disabled = true;

    mediaRecorder.onstop = () => {
        console.log("Recording stopped. Chunks length:", audioChunks.length); // Debugging log
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' }); // Set MIME type explicitly
        document.getElementById('audioPlayback').src = URL.createObjectURL(audioBlob);
        document.getElementById('audioPlayback').hidden = false;
    };
});
document.getElementById('reformulate-btn').addEventListener('click', function() {
    const transcriptionText = document.getElementById('transcription-textarea').textContent;

    fetch('/reformulate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transcription: transcriptionText })
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('transcription-textarea').textContent = data.refinedTranscription;
    })
    .catch(error => console.error('Error:', error));
});

// [Previous JavaScript]

document.getElementById('reformulate-btn').addEventListener('click', function() {
    processTranscription('reformulate');
});

document.getElementById('generate-questions-btn').addEventListener('click', function() {
    processTranscription('generate-questions');
});

document.getElementById('generate-notes-btn').addEventListener('click', function() {
    processTranscription('generate-notes');
});

function processTranscription(action) {
    const transcriptionText = document.getElementById('transcription-textarea').value;
    const requestBody = { action: action, transcription: transcriptionText };

    fetch('/process-transcript', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        document.getElementById('gpt-response').textContent = data.gptResponse;
        document.getElementById('error-message').classList.add('d-none');
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('error-message').textContent = error.message;
        document.getElementById('error-message').classList.remove('d-none');
    });
}

// [Rest of the JavaScript]

