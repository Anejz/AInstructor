function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablink");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

// Set default active tab on page load
document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('.tablink').click(); // Open the first tab
});
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
    const audioPlayer = document.getElementById('audioPlaybackUpload');
    const file = event.target.files[0];
    if (file) {
        audioPlayer.src = URL.createObjectURL(file);
        audioPlayer.hidden = false;
    }
});

// Audio Recording


// 1. Initialize MediaRecorder
let mediaRecorder;
let audioChunks = [];

function initMediaRecorder(stream) {
    console.log('Initializing MediaRecorder with the stream:', stream);
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.addEventListener('dataavailable', event => {
        if (event.data.size > 0) {
            audioChunks.push(event.data);
        }
    });
    function setRecordingAsFile(audioBlob, filename) {
        const audioFile = new File([audioBlob], filename, { type: 'audio/webm' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(audioFile);
        document.getElementById('fileInput').files = dataTransfer.files;
    }
    // Updated to handle promises and errors more effectively
    mediaRecorder.addEventListener('stop', async () => {
        try {
            if (audioChunks.length > 0) {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                console.log('Recording stopped, audio available at:', audioUrl);
                const audioElement = document.getElementById('audioPlaybackRecord');
                const uploadLabel = document.getElementById('uploadLabel');
                audioElement.src = audioUrl;
                audioElement.hidden = false;
                setRecordingAsFile(audioBlob, "recording.webm");
                audioElement.load(); // Ensure the audio element loads the new blob URL
                audioElement.play(); // Optional: Attempt to play the audio immediately
            } else {
                console.error('No audio chunks available.');
            }
        } catch (error) {
            console.error('Error after stopping recording:', error);
        }
    });
}

// 2. Test the Stream
document.getElementById('startRecording').addEventListener('click', () => {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            if (stream.active && stream.getAudioTracks().length > 0) {
                console.log('Stream is active with audio tracks:', stream.getAudioTracks());
                initMediaRecorder(stream);
                mediaRecorder.start();
                document.getElementById('stopRecording').disabled = false;
            } else {
                console.error('Stream is not active or does not have audio tracks.');
            }
        })
        .catch(err => {
            console.error("Error accessing the microphone: ", err);
            alert("Error accessing the microphone: " + err.message);
        });
});

// 3. Check Blob Creation and 4. Audio Playback are handled in the 'stop' event listener
document.getElementById('stopRecording').addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        document.getElementById('stopRecording').disabled = true;
    } else {
        console.error('MediaRecorder is not recording.');
    }
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

